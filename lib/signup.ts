// =====================================================
// Signup — suscripción automática desde el registro público
// =====================================================
// Crea la suscripción del plan elegido, una cuota pendiente del ciclo
// y dispara la boleta por email al cliente (facturación manual).

import { prisma } from '@/lib/prisma'
import { sendAccountEmail } from './email-hooks'
import { sendEmail } from './resend'

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

/** Crea los streams que el plan incluye y el cliente aún no tiene. */
export async function ensureStreamsForServices(clientId: string, services: string) {
  const { createRadioStreamForClient, createVideoStreamForClient } = await import('./streaming-helpers')
  const rs = await prisma.radioStream.findUnique({ where: { clientId }, select: { id: true } })
  const vs = await prisma.videoStream.findUnique({ where: { clientId }, select: { id: true } })
  if ((services === 'radio' || services === 'both') && !rs) {
    await createRadioStreamForClient(clientId)
  }
  if ((services === 'tv' || services === 'both') && !vs) {
    await createVideoStreamForClient(clientId)
  }
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

/**
 * Notifica al administrador por email cuando se registra un cliente nuevo.
 * El destino se configura en /admin/settings (AppConfig.adminNotifyEmail).
 * Fallback: ADMIN_NOTIFY_EMAIL (env) o felipevegaesparza@gmail.com.
 */
export async function notifyAdminNewSignup(info: { name: string; email: string; planName?: string }) {
  const config = await prisma.appConfig.findFirst({ select: { adminNotifyEmail: true } })
  const to = config?.adminNotifyEmail || process.env.ADMIN_NOTIFY_EMAIL || 'felipevegaesparza@gmail.com'
  if (!to) return

  const panelUrl = process.env.NEXTAUTH_URL || 'https://panelipstream.cl'
  const planLabel = info.planName ? ` · Plan: <strong>${info.planName}</strong>` : ' · Sin plan'

  const html = `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:520px;margin:0 auto">
    <h2 style="margin:0 0 4px">IPStream</h2>
    <p style="color:#6b7280;margin:0 0 16px">Nuevo registro de cliente 🎉</p>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px">
      <p style="margin:0 0 8px"><strong>Nombre:</strong> ${info.name}</p>
      <p style="margin:0 0 8px"><strong>Email:</strong> ${info.email}</p>
      <p style="margin:0">${planLabel}</p>
    </div>
    <p style="margin:20px 0 0">
      <a href="${panelUrl}/admin/users" style="display:inline-block;background:#0891b2;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver clientes</a>
    </p>
  </div>
</div>`

  try {
    await sendEmail({
      to,
      subject: `Nuevo registro: ${info.name}`,
      html,
      templateKey: 'aviso-admin',
    })
  } catch {}
}
