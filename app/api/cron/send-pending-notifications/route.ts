import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushNotification } from '@/lib/push-notifications'
import crypto from 'crypto'

function isAuthorized(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const provided = authHeader.slice('Bearer '.length)
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado')
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    if (!isAuthorized(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const now = new Date()

    const pendingNotifications = await prisma.pushNotification.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: now }
      },
      include: {
        client: {
          select: {
            oneSignalAppId: true,
            oneSignalApiKey: true
          }
        }
      }
    })

    const results = []

    for (const notification of pendingNotifications) {
      // Idempotencia: reclamo condicional `pending` → `sending`. Si otra corrida
      // ya la tomó, `count` es 0 y se omite para no reenviar.
      const claimed = await prisma.pushNotification.updateMany({
        where: { id: notification.id, status: 'pending' },
        data: { status: 'sending' }
      })

      if (claimed.count === 0) {
        results.push({ id: notification.id, status: 'skipped', reason: 'already processing' })
        continue
      }

      const result = await sendPushNotification(notification.client, {
        notificationId: notification.id,
        title: notification.title,
        message: notification.message,
        imageUrl: notification.imageUrl,
        targetUrl: notification.targetUrl
      })

      await prisma.pushNotification.update({
        where: { id: notification.id },
        data: {
          status: result.ok ? 'sent' : 'failed',
          sentAt: result.ok ? new Date() : null,
          oneSignalId: result.id,
          recipientsCount: result.recipients
        }
      })

      results.push({
        id: notification.id,
        status: result.ok ? 'sent' : 'failed',
        ...(result.error && { error: result.error })
      })
    }

    return NextResponse.json({
      processed: pendingNotifications.length,
      results
    })
  } catch (error) {
    console.error('Error in cron job:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
