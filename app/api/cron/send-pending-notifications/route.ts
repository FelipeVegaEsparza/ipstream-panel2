import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
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
      const { client } = notification
      const oneSignalAppId = client?.oneSignalAppId
      const oneSignalApiKey = client?.oneSignalApiKey

      if (!oneSignalAppId || !oneSignalApiKey) {
        await prisma.pushNotification.update({
          where: { id: notification.id },
          data: { status: 'failed' }
        })
        results.push({ id: notification.id, status: 'failed', reason: 'OneSignal not configured' })
        continue
      }

      try {
        const apiKey = decrypt(oneSignalApiKey)

        const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${apiKey}`
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            included_segments: ['All'],
            headings: { en: notification.title },
            contents: { en: notification.message },
            ...(notification.imageUrl && { big_picture: notification.imageUrl }),
            ...(notification.targetUrl && { url: notification.targetUrl }),
            data: { notificationId: notification.id }
          })
        })

        const oneSignalData = await oneSignalResponse.json()

        if (oneSignalResponse.ok) {
          await prisma.pushNotification.update({
            where: { id: notification.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
              oneSignalId: oneSignalData.id,
              recipientsCount: oneSignalData.recipients || 0
            }
          })
          results.push({ id: notification.id, status: 'sent' })
        } else {
          await prisma.pushNotification.update({
            where: { id: notification.id },
            data: { status: 'failed' }
          })
          results.push({ id: notification.id, status: 'failed', error: oneSignalData })
        }
      } catch (error) {
        await prisma.pushNotification.update({
          where: { id: notification.id },
          data: { status: 'failed' }
        })
        results.push({ id: notification.id, status: 'failed', error: String(error) })
      }
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
