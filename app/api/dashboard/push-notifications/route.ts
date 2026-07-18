import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { z } from 'zod'
import { decrypt } from '@/lib/encryption'
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
    const session = await getServerSession(authOptions)
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
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const effectiveClient = await getEffectiveClient()

    if (!effectiveClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = rateLimit({
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

    let apiKey: string
    try {
      apiKey = decrypt(client.oneSignalApiKey)
    } catch {
      apiKey = client.oneSignalApiKey
    }

    let oneSignalId = null
    let sentAt = null
    let recipientsCount = 0
    let errorMessage = null
    let status = 'pending'

    try {
      const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify({
          app_id: client.oneSignalAppId,
          included_segments: ['All'],
          headings: { en: title },
          contents: { en: message },
          ...(imageUrl && { big_picture: imageUrl }),
          ...(targetUrl && { url: targetUrl }),
          data: { notificationId: notification.id }
        })
      })

      const oneSignalData = await oneSignalResponse.json()

      if (oneSignalResponse.ok) {
        oneSignalId = oneSignalData.id
        status = 'sent'
        sentAt = new Date()
        recipientsCount = oneSignalData.recipients || 0
      } else {
        const errorMsg = oneSignalData.errors
          ? (Array.isArray(oneSignalData.errors) ? oneSignalData.errors[0] : oneSignalData.errors)
          : 'Error al enviar la notificación'
        errorMessage = errorMsg
        status = 'failed'
      }
    } catch (error) {
      errorMessage = 'Error de conexión con OneSignal'
      status = 'failed'
    }

    await prisma.pushNotification.update({
      where: { id: notification.id },
      data: { oneSignalId, sentAt, status, recipientsCount }
    })

    return NextResponse.json({
      message: status === 'sent'
        ? `Notificación enviada a ${recipientsCount} usuarios`
        : 'Notificación creada pero falló el envío',
      notification: { ...notification, oneSignalId, sentAt, status, recipientsCount },
      ...(errorMessage && { error: errorMessage })
    })
  } catch (error) {
    console.error('Error al crear notificación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
