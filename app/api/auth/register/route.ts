import { NextRequest, NextResponse } from 'next/server'
import { hash as hashPassword } from '@node-rs/bcrypt'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { createRadioStreamForClient, createVideoStreamForClient } from '@/lib/streaming-helpers'
import { rateLimit } from '@/lib/rate-limit'
import { getClientSitesConfig } from '@/lib/client-sites-config'
import { slugifyRadioName, slugError, buildSiteHost } from '@/lib/domain-slug'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { LEGAL_VERSION } from '@/lib/legal'

/** El plan recibido no existe o no está activo. */
class PlanUnavailableError extends Error {}

/** El nombre de radio no sirve como subdominio (inválido, reservado o tomado). */
class SubdomainUnavailableError extends Error {}

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
    const { allowed } = await rateLimit({
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
    const { name, email, password, planId, radioName, currency, acceptLegal, referralCode } = registerSchema.parse(body)
    const signupUserAgent = request.headers.get('user-agent')?.slice(0, 500) || null

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
    const hashedPassword = await hashPassword(password, { cost: 10 })

    // Config de sitios (dominio base) para el subdominio del cliente.
    const sitesConfig = await getClientSitesConfig()

    // Cuenta, cliente, plan solicitado y streams en una sola transacción.
    // La suscripción y el pago se crean recién cuando el admin activa la cuenta.
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
          isActive: false,
          client: {
            create: {
              name: name,
              planId: plan?.id ?? null,
              billingCurrency: currency || null,
              legalAcceptedAt: acceptLegal ? new Date() : null,
              legalVersion: acceptLegal ? LEGAL_VERSION : null,
              legalAcceptedIp: acceptLegal ? ip : null,
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

      // Subdominio del sitio a partir del nombre de la radio (atómico con la cuenta).
      let clientDomain = null
      if (sitesConfig.domain) {
        const slug = slugifyRadioName(radioName)
        const slugErr = slugError(slug)
        if (slugErr === 'reserved') {
          throw new SubdomainUnavailableError('Ese nombre está reservado. Elige otro.')
        }
        if (slugErr) {
          throw new SubdomainUnavailableError('El nombre de la radio no es válido para un sitio.')
        }
        const hostname = buildSiteHost(slug, sitesConfig.domain)
        const taken = await tx.clientDomain.findUnique({ where: { hostname }, select: { id: true } })
        if (taken) {
          throw new SubdomainUnavailableError('Ese nombre ya está en uso. Elige otro.')
        }
        clientDomain = await tx.clientDomain.create({
          data: { clientId: client.id, hostname, kind: 'subdomain', status: 'active', isPrimary: true },
        })
        await tx.basicData.upsert({
          where: { clientId: client.id },
          update: { projectName: radioName, websiteUrl: `https://${hostname}` },
          create: { clientId: client.id, projectName: radioName, projectDescription: '', websiteUrl: `https://${hostname}` },
        })
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

      // Atribución de referido: se valida y persiste dentro de la misma
      // transacción. Un código inválido no bloquea el registro.
      let referralApplied = false
      let referralPendingReview = false
      let referralId: string | null = null
      let referralReferrerClientId: string | null = null
      if (referralCode) {
        const { resolveReferralAttribution, attachReferralToClient } = await import(
          '@/lib/referrals/attribution'
        )
        const attribution = await resolveReferralAttribution(
          { code: referralCode, email, ip },
          tx
        )
        if (attribution.applied && attribution.referrerClientId && attribution.code) {
          const referral = await attachReferralToClient(
            {
              referrerClientId: attribution.referrerClientId,
              referredClientId: client.id,
              code: attribution.code,
              signupIp: ip,
              signupUserAgent,
              flagged: attribution.flagged,
              flagReason: attribution.flagReason ?? null,
            },
            tx
          )
          if (referral) {
            referralApplied = true
            referralPendingReview = attribution.flagged
            referralId = referral.id
            referralReferrerClientId = attribution.referrerClientId
          }
        }
      }

      return {
        user,
        client,
        radioStream,
        plan,
        clientDomain,
        referralApplied,
        referralPendingReview,
        referralId,
        referralReferrerClientId,
      }
    }, { timeout: 15000 })

    const clientId = result.client.id
    const planName = result.plan?.name
    const streamInfo = result.radioStream
    const siteUrl = result.clientDomain ? `https://${result.clientDomain.hostname}` : null

    // Aviso al referente (best-effort, fuera de la transacción).
    if (result.referralId && result.referralReferrerClientId) {
      try {
        const { notifyReferralRegistered } = await import('@/lib/referrals/events')
        await notifyReferralRegistered(
          {
            referralId: result.referralId,
            referrerClientId: result.referralReferrerClientId,
            referredName: result.client.name,
          },
          prisma
        )
      } catch (err) {
        console.error('Error notificando el nuevo referido:', err)
      }
    }

    // Provisión best-effort del subdominio (idempotente; con el wildcard queda active).
    if (result.clientDomain) {
      try {
        const { startDomainProvisioning } = await import('@/lib/domain-provisioner')
        startDomainProvisioning(result.clientDomain.id)
      } catch (err) {
        console.error('Error iniciando provisión del subdominio:', err)
      }
    }

    // Correo de recepción: la cuenta queda pendiente de activación.
    try {
      const { sendPendingSignupEmail } = await import('@/lib/email-hooks')
      await sendPendingSignupEmail(clientId)
    } catch (err) {
      console.error('Error enviando correo de registro pendiente:', err)
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
      message: 'Solicitud recibida. La cuenta queda pendiente de activación.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      },
      planRequested: result.client.planId ? { planId: result.client.planId } : null,
      pendingActivation: true,
      referralApplied: result.referralApplied,
      referralPendingReview: result.referralPendingReview,
      siteUrl,
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
    if (error instanceof SubdomainUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ese nombre ya está en uso. Elige otro.' },
        { status: 409 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
