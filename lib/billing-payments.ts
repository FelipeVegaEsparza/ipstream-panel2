// =====================================================
// Billing — marcar un pago como pagado (idempotente)
// =====================================================

import { prisma } from './prisma'
import { SUBSCRIPTION_STATUS } from './subscription-status'

/**
 * Marca un pago como `completed` (idempotente). Si el pago ya estaba
 * completado, no lo altera. Activa la suscripción si estaba en prueba/pendiente.
 */
export async function markPaymentPaid(
  paymentId: string,
  opts: { method: string; transactionId?: string | null }
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { subscription: { select: { id: true, status: true } } },
  })
  if (!payment) return null
  if (payment.status === 'completed') return payment

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'completed',
      paymentMethod: opts.method,
      transactionId: opts.transactionId ?? payment.transactionId,
      paidAt: new Date(),
    },
  })

  if (payment.subscription && payment.subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: { status: SUBSCRIPTION_STATUS.ACTIVE },
    })
  }

  return updated
}
