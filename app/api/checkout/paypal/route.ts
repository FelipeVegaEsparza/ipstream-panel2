import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveClientFromRequest } from '@/lib/getEffectiveClient'
import { paypalEnabled, isPaypalCurrency, createPaypalOrder } from '@/lib/paypal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function panelOrigin(request: NextRequest): string {
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).origin
    } catch {}
  }
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || 'localhost:3000'
  return `${proto}://${host}`
}

/** Crea una orden de PayPal para un pago pendiente del cliente. */
export async function POST(request: NextRequest) {
  const effective = await getEffectiveClientFromRequest(request)
  if (!effective) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!paypalEnabled()) return NextResponse.json({ error: 'PayPal no está configurado' }, { status: 400 })

  const { paymentId } = await request.json().catch(() => ({}))
  if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, clientId: effective.clientId },
  })
  if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
  if (payment.status !== 'pending' && payment.status !== 'failed') {
    return NextResponse.json({ error: 'El pago no está pendiente' }, { status: 400 })
  }
  if (!isPaypalCurrency(payment.currency)) {
    return NextResponse.json(
      { error: `PayPal no permite pagar en ${payment.currency}` },
      { status: 400 }
    )
  }

  const origin = panelOrigin(request)
  try {
    const order = await createPaypalOrder({
      amount: payment.amount,
      currency: payment.currency,
      referenceId: payment.id,
      returnUrl: `${origin}/dashboard/payments?paypal=return&payment=${payment.id}`,
      cancelUrl: `${origin}/dashboard/payments?paypal=cancel`,
    })
    return NextResponse.json({ orderId: order.id, approvalUrl: order.approvalUrl })
  } catch (error) {
    console.error('PayPal create order error:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 502 })
  }
}
