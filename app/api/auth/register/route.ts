import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { createRadioStreamForClient, createVideoStreamForClient } from '@/lib/streaming-helpers'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
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
    const { name, email, password } = registerSchema.parse(body)

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

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario y cliente
    const user = await prisma.user.create({
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

    // Plan elegido: servicios que incluye y servidor por defecto.
    // Sin plan → ambos servicios en el servidor principal/global.
    let planServices = 'both'
    let planServerId: string | null = null
    if (body.planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: body.planId },
        select: { services: true, defaultServerId: true },
      })
      planServices = plan?.services || 'both'
      planServerId = plan?.defaultServerId || null
    }

    // Auto-crear streams según los servicios del plan (en su servidor por defecto)
    let streamInfo = null
    if (user.client) {
      if (planServices === 'radio' || planServices === 'both') {
        try {
          streamInfo = await createRadioStreamForClient(user.client.id, 128, planServerId || undefined)
        } catch (err) {
          console.error('Error creando RadioStream para nuevo cliente:', err)
        }
      }
      if (planServices === 'tv' || planServices === 'both') {
        try {
          await createVideoStreamForClient(user.client.id, planServerId || undefined)
        } catch (err) {
          console.error('Error creando VideoStream para nuevo cliente:', err)
        }
      }
    }

    // Si viene un plan elegido (registro desde /registro), crear suscripción + cuota
    let planAssigned = null
    if (body.planId && user.client) {
      try {
        const { createSignupSubscription } = await import('@/lib/signup')
        planAssigned = await createSignupSubscription(user.client.id, body.planId)
      } catch (err) {
        console.error('Error asignando plan al registrarse:', err)
      }
    }

    // Contenido por defecto del AutoDJ (playlist + tema) — aislado, nunca rompe el registro
    if (user.client && streamInfo) {
      try {
        const { seedDefaultAutoDjContent } = await import('@/lib/streaming-seed')
        await seedDefaultAutoDjContent(user.client.id)
      } catch (err) {
        console.error('Error sembrando contenido por defecto al registrarse:', err)
      }
    }

    // Notificar al admin del nuevo registro (email)
    try {
      const { notifyAdminNewSignup } = await import('@/lib/signup')
      const planName = body.planId
        ? (await prisma.plan.findUnique({ where: { id: body.planId }, select: { name: true } }))?.name
        : undefined
      await notifyAdminNewSignup({ name, email, planName })
    } catch (err) {
      console.error('Error notificando registro al admin:', err)
    }

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      planAssigned: planAssigned ? { planId: body.planId } : null,
      // Devolvemos info del stream para que la UI pueda mostrarlo
      stream: streamInfo ? {
        icecastMount: streamInfo.icecastMount,
        telnetPort: streamInfo.telnetPort,
        // NO devolvemos passwords — eso va por /api/dashboard/streaming/connection
      } : null,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}