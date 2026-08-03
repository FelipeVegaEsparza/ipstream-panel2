import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const webhookSecret = process.env.ONESIGNAL_WEBHOOK_SECRET
    const authHeader = request.headers.get('authorization')

    if (!webhookSecret) {
      console.error('ONESIGNAL_WEBHOOK_SECRET no está configurado')
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    if (!isAuthorized(authHeader, webhookSecret)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // OneSignal sends different payloads depending on the event type
    // For notification clicks, try to extract the notification ID from custom data
    const notificationId = body?.notificationId || body?.data?.notificationId || body?.custom?.notificationId || body?.additional_data?.notificationId

    if (!notificationId) {
      // If we can't find a custom notificationId, try matching by OneSignal notification ID
      const oneSignalNotificationId = body?.id || body?.notification_id

      if (oneSignalNotificationId) {
        await prisma.pushNotification.updateMany({
          where: { oneSignalId: oneSignalNotificationId },
          data: { clicksCount: { increment: 1 } }
        })
        return NextResponse.json({ received: true })
      }

      return NextResponse.json({ error: 'No notificationId found' }, { status: 400 })
    }

    await prisma.pushNotification.update({
      where: { id: notificationId },
      data: { clicksCount: { increment: 1 } }
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing OneSignal webhook:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
