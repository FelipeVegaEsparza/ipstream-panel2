import { NextRequest } from 'next/server'
import { verifyPaypalWebhook, capturePaypalOrder } from '@/lib/paypal'
import { markPaymentPaid } from '@/lib/billing-payments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook de PayPal: concilia pagos de forma idempotente.
 * Requiere PAYPAL_WEBHOOK_ID para verificar la firma.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text()
  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const valid = await verifyPaypalWebhook(request.headers, event).catch(() => false)
  if (!valid) {
    return new Response('invalid signature', { status: 400 })
  }

  try {
    const type: string = event?.event_type || ''
    if (type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = event?.resource?.id
      if (orderId) {
        const result = await capturePaypalOrder(String(orderId))
        if (result.completed && result.referenceId) {
          await markPaymentPaid(result.referenceId, { method: 'paypal', transactionId: result.captureId })
        }
      }
    } else if (type === 'PAYMENT.CAPTURE.COMPLETED') {
      const ref = event?.resource?.custom_id || event?.resource?.reference_id
      if (ref) {
        await markPaymentPaid(String(ref), { method: 'paypal', transactionId: event?.resource?.id })
      }
    }
    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('PayPal webhook error:', error)
    return new Response('error', { status: 500 })
  }
}
