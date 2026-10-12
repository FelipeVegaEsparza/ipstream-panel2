import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { capturePaypalOrder } from '@/lib/paypal'
import { markPaymentPaid } from '@/lib/billing-payments'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Captura una orden de PayPal y marca el pago como completado. */
export async function POST(request: NextRequest) {
  const effective = await getEffectiveClientFromRequest(request)
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { orderId } = await request.json().catch(() => ({}))
  if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 })

  try {
    const result = await capturePaypalOrder(String(orderId))
    if (!result.completed || !result.referenceId) {
      return NextResponse.json({ ok: false, error: 'La captura no se completó' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
      where: { id: result.referenceId, clientId: effective.clientId },
      select: { id: true },
    })
    if (!payment) return NextResponse.json({ ok: false, error: 'Pago no encontrado' }, { status: 404 })

    await markPaymentPaid(payment.id, { method: 'paypal', transactionId: result.captureId })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PayPal capture error:', error)
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 502 })
  }
}
