import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { createRadioStreamForClient, createVideoStreamForClient } from '@/lib/streaming-helpers'
import { createSignupSubscription } from '@/lib/signup'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

/** El plan recibido no existe o no está activo. */
class PlanUnavailableError extends Error {}

/**
 * Extrae la IP real del solicitante.
 *
 * `x-forwarded-for` puede traer valores añadidos por el cliente; el proxy de
 * confianza (Caddy) agrega la IP real al final de la cadena, así que se toma
 * el último valor y no el primero. Si no hay cabecera se usa `x-real-ip`.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const lastHop = forwarded
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .pop()

  return lastHop || request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const { allowed } = rateLimit({
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 5 registros por hora por IP
      identifier: `register:${ip}`,
    })

    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro. Inténtalo más tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, password, planId } = registerSchema.parse(body)

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      )
    }

    // Hashear la contraseña (fuera de la transacción: es costoso y no toca la DB)
    const hashedPassword = await bcrypt.hash(password, 12)

    // Cuenta, cliente, streams, suscripción, pago y cuotas en una sola transacción.
    // Nada de efectos externos (correos, agente de streaming) dentro de la transacción.
    const result = await prisma.$transaction(async (tx) => {
      // El plan elegido se valida dentro de la transacción: sin plan válido no se crea nada.
      let plan = null
      if (planId) {
        plan = await tx.plan.findUnique({ where: { id: planId } })
        if (!plan || !plan.isActive) {
          throw new PlanUnavailableError()
        }
      }

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          client: {
            create: {
              name: name,
            }
          }
        },
        include: {
          client: true
        }
      })

      const client = user.client
      if (!client) {
        throw new Error('No se pudo crear el cliente del usuario')
      }

      const planServices = plan?.services || 'both'
      const planServerId = plan?.defaultServerId || undefined

      // Auto-crear streams según los servicios del plan (en su servidor por defecto)
      let radioStream = null
      if (planServices === 'radio' || planServices === 'both') {
        radioStream = await createRadioStreamForClient(client.id, 128, planServerId, tx)
      }
      if (planServices === 'tv' || planServices === 'both') {
        await createVideoStreamForClient(client.id, planServerId, tx)
      }

      // Suscripción + cuota inicial + primer pago pendiente
      let subscription = null
      if (plan) {
        subscription = await createSignupSubscription(tx, client.id, plan)
      }

      return { user, client, radioStream, subscription, plan }
    }, { timeout: 15000 })

    const clientId = result.client.id
    const planName = result.plan?.name
    const streamInfo = result.radioStream

    // Correos (tras el commit, aislados: un fallo no revierte el registro).
    // Durante la prueba no se envía cobro inmediato: sólo la bienvenida con la
    // fecha de cobro; la boleta se envía al confirmarse el primer pago.
    if (result.subscription && result.plan) {
      try {
        const { sendAccountEmail, sendWelcomeEmail } = await import('@/lib/email-hooks')
        const { payment, isTrial, trialDays } = result.subscription
        if (!isTrial) {
          await sendAccountEmail(
            clientId,
            {
              amount: payment.amount,
              currency: payment.currency,
              dueDate: payment.dueDate,
              description: payment.description,
            },
            result.plan.name
          )
        }
        await sendWelcomeEmail(
          clientId,
          result.plan.name,
          isTrial
            ? { trialDays, chargeDate: payment.dueDate, amount: payment.amount, currency: payment.currency }
            : null
        )
      } catch (err) {
        console.error('Error enviando correos de registro:', err)
      }
    }

    // Contenido por defecto del AutoDJ (tras el commit, best-effort).
    // El resultado se reporta al admin para reintentar si el nodo remoto falló.
    let seed: { ok: boolean; error?: string } | null = null
    if (result.radioStream) {
      try {
        const { seedDefaultAutoDjContent } = await import('@/lib/streaming-seed')
        seed = await seedDefaultAutoDjContent(clientId)
      } catch (err) {
        seed = { ok: false, error: (err as Error).message }
        console.error('Error sembrando contenido por defecto al registrarse:', err)
      }
    }

    // Notificar al admin del nuevo registro (email)
    try {
      const { notifyAdminNewSignup } = await import('@/lib/signup')
      await notifyAdminNewSignup({ name, email, planName, seed })
    } catch (err) {
      console.error('Error notificando registro al admin:', err)
    }

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      },
      planAssigned: result.subscription ? { planId } : null,
      // Devolvemos info del stream para que la UI pueda mostrarlo
      stream: streamInfo ? {
        icecastMount: streamInfo.icecastMount,
        telnetPort: streamInfo.telnetPort,
        // NO devolvemos passwords — eso va por /api/dashboard/streaming/connection
      } : null,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof PlanUnavailableError) {
      return NextResponse.json(
        { error: 'El plan seleccionado no está disponible' },
        { status: 400 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
