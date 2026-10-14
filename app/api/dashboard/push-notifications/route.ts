import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { z } from 'zod'
import { sendPushNotification } from '@/lib/push-notifications'
import { rateLimit } from '@/lib/rate-limit'

const createNotificationSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(50, 'El título no puede exceder 50 caracteres'),
  message: z.string().min(1, 'El mensaje es requerido').max(200, 'El mensaje no puede exceder 200 caracteres'),
  imageUrl: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
  targetUrl: z.string().url('URL de destino inválida').optional().or(z.literal('')),
  scheduledFor: z.string().datetime('Fecha inválida').optional().nullable(),
})

export async function GET(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'notifications')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effectiveClient = await getEffectiveClient()
    if (!effectiveClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const notifications = await prisma.pushNotification.findMany({
      where: { clientId: effectiveClient.clientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'notifications')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effectiveClient = await getEffectiveClient()

    if (!effectiveClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = await rateLimit({
      maxRequests: 10,
      windowMs: 60 * 1000,
      identifier: `push-notifications:${clientIp}`
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        error: 'Demasiadas solicitudes. Intenta de nuevo en 1 minuto.'
      }, { status: 429 })
    }

    const client = await prisma.client.findUnique({
      where: { id: effectiveClient.clientId },
      select: {
        oneSignalAppId: true,
        oneSignalApiKey: true
      }
    })

    if (!client?.oneSignalAppId || !client?.oneSignalApiKey) {
      return NextResponse.json({
        error: 'OneSignal no está configurado para este cliente'
      }, { status: 400 })
    }

    const body = await request.json()
    const parsed = createNotificationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: parsed.error.flatten().fieldErrors
      }, { status: 400 })
    }

    const { title, message, imageUrl, targetUrl, scheduledFor } = parsed.data

    const notification = await prisma.pushNotification.create({
      data: {
        clientId: effectiveClient.clientId,
        title,
        message,
        imageUrl: imageUrl || null,
        targetUrl: targetUrl || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: 'pending'
      }
    })

    if (scheduledFor) {
      return NextResponse.json({
        message: 'Notificación programada exitosamente',
        notification
      })
    }

    const result = await sendPushNotification(client, {
      notificationId: notification.id,
      title,
      message,
      imageUrl,
      targetUrl
    })

    const status = result.ok ? 'sent' : 'failed'
    const sentAt = result.ok ? new Date() : null

    await prisma.pushNotification.update({
      where: { id: notification.id },
      data: {
        oneSignalId: result.id,
        sentAt,
        status,
        recipientsCount: result.recipients
      }
    })

    return NextResponse.json({
      message: result.ok
        ? `Notificación enviada a ${result.recipients} usuarios`
        : 'Notificación creada pero falló el envío',
      notification: {
        ...notification,
        oneSignalId: result.id,
        sentAt,
        status,
        recipientsCount: result.recipients
      },
      ...(result.error && { error: result.error })
    })
  } catch (error) {
    console.error('Error al crear notificación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
