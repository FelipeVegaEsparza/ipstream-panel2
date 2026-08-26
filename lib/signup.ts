// =====================================================
// Signup — suscripción automática desde el registro público
// =====================================================
// Crea la suscripción del plan elegido, una cuota pendiente del ciclo
// y dispara la boleta por email al cliente (facturación manual).

import { prisma } from '@/lib/prisma'
import { sendAccountEmail } from './email-hooks'

/** Aplica las cuotas de almacenamiento del plan a los streams del cliente. */
export async function applyPlanQuotasToClient(
  clientId: string,
  plan: { radioStorageQuotaMB?: number | null; videoStorageQuotaMB?: number | null }
) {
  await prisma.radioStream.updateMany({
    where: { clientId },
    data: { storageQuotaMB: plan.radioStorageQuotaMB ?? null },
  })
  await prisma.videoStream.updateMany({
    where: { clientId },
    data: { storageQuotaMB: plan.videoStorageQuotaMB ?? null },
  })
}

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

  // Aplicar cuotas de almacenamiento del plan (restringe la biblioteca de inmediato)
  await applyPlanQuotasToClient(clientId, plan)

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
