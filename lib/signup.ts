// =====================================================
// Signup — suscripción automática desde el registro público
// =====================================================
// Crea la suscripción del plan elegido, una cuota pendiente del ciclo
// y dispara la boleta por email al cliente (facturación manual).

import { prisma } from '@/lib/prisma'
import { sendAccountEmail } from './email-hooks'

export async function createSignupSubscription(clientId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan || !plan.isActive) {
    throw new Error('Plan no disponible')
  }

  const now = new Date()
  const endDate = new Date(now)
  if (plan.interval === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1)
  else endDate.setMonth(endDate.getMonth() + 1)

  const subscription = await prisma.subscription.create({
    data: {
      clientId,
      planId: plan.id,
      status: 'active',
      startDate: now,
      endDate,
    },
  })

  const monthLabel = endDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const description = `${plan.interval === 'yearly' ? 'Pago anual' : 'Pago mensual'} - ${monthLabel}`

  const payment = await prisma.payment.create({
    data: {
      clientId,
      subscriptionId: subscription.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      paymentMethod: 'pending',
      description,
      dueDate: endDate,
    },
  })

  // Boleta automática (email) al cliente — aislada, nunca rompe el registro
  try {
    await sendAccountEmail(
      clientId,
      { amount: plan.price, currency: plan.currency, dueDate: endDate, description },
      plan.name
    )
  } catch {}

  return { subscription, payment }
}
