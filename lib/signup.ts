// =====================================================
// Signup — suscripción automática desde el registro público
// =====================================================
// Crea la suscripción del plan elegido, una cuota pendiente del ciclo y
// aplica las cuotas de almacenamiento. Sólo escribe en la base de datos:
// la ruta de registro ejecuta los correos y el seed del AutoDJ después de
// que la transacción confirma.

import { prisma, type PrismaDb } from '@/lib/prisma'
import { sendEmail } from './resend'
import { SUBSCRIPTION_STATUS } from './subscription-status'

/** Campos del plan que necesita la creación de la suscripción. */
export interface SignupPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  radioStorageQuotaMB: number | null
  videoStorageQuotaMB: number | null
}

/** Aplica las cuotas de almacenamiento del plan a los streams del cliente. */
export async function applyPlanQuotasToClient(
  clientId: string,
  plan: { radioStorageQuotaMB?: number | null; videoStorageQuotaMB?: number | null },
  db: PrismaDb = prisma
) {
  await db.radioStream.updateMany({
    where: { clientId },
    data: { storageQuotaMB: plan.radioStorageQuotaMB ?? null },
  })
  await db.videoStream.updateMany({
    where: { clientId },
    data: { storageQuotaMB: plan.videoStorageQuotaMB ?? null },
  })
}

/** Crea los streams que el plan incluye y el cliente aún no tiene (en el server del plan). */
export async function ensureStreamsForServices(
  clientId: string,
  services: string,
  serverId?: string | null,
  db: PrismaDb = prisma
) {
  const { createRadioStreamForClient, createVideoStreamForClient } = await import('./streaming-helpers')
  const rs = await db.radioStream.findUnique({ where: { clientId }, select: { id: true } })
  const vs = await db.videoStream.findUnique({ where: { clientId }, select: { id: true } })
  if ((services === 'radio' || services === 'both') && !rs) {
    await createRadioStreamForClient(clientId, 128, serverId || undefined, db)
  }
  if ((services === 'tv' || services === 'both') && !vs) {
    await createVideoStreamForClient(clientId, serverId || undefined, db)
  }
}

/**
 * Crea la suscripción, la cuota inicial y el primer pago pendiente para un
 * cliente recién registrado, y aplica las cuotas del plan.
 *
 * Si `AppConfig.trialDays` es mayor que 0, la suscripción nace en estado de
 * prueba (`trialing`), el plan queda activo y el primer cobro se programa
 * para el fin de la prueba. Si es 0, nace activa como antes.
 *
 * No envía correos ni ejecuta side effects externos: debe llamarse dentro de
 * la misma transacción que crea la cuenta para que un fallo no deje estados
 * parciales. El plan ya debe venir validado (existe y está activo).
 */
export async function createSignupSubscription(db: PrismaDb, clientId: string, plan: SignupPlan) {
  const now = new Date()

  // Duración de la prueba (global). Sin fila de config → 7 días por defecto.
  const config = await db.appConfig.findFirst({ select: { trialDays: true } })
  const trialDays = config?.trialDays ?? 7
  const trialEndsAt = trialDays > 0
    ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
    : null

  // Fin del primer período pagado (si no hay prueba, es el fin del período actual).
  const periodEnd = new Date(now)
  if (plan.interval === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  else periodEnd.setMonth(periodEnd.getMonth() + 1)

  const isTrial = trialEndsAt !== null
  const firstChargeDate = isTrial ? trialEndsAt! : periodEnd

  const subscription = await db.subscription.create({
    data: {
      clientId,
      planId: plan.id,
      status: isTrial ? SUBSCRIPTION_STATUS.TRIALING : SUBSCRIPTION_STATUS.ACTIVE,
      startDate: now,
      endDate: isTrial ? trialEndsAt! : periodEnd,
      trialEndsAt,
    },
  })

  // Vincular el plan al cliente (lo usa el menú y el dashboard)
  await db.client.update({
    where: { id: clientId },
    data: { planId: plan.id },
  })

  const chargeLabel = firstChargeDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const description = isTrial
    ? `Primer pago tras la prueba gratis - ${chargeLabel}`
    : `${plan.interval === 'yearly' ? 'Pago anual' : 'Pago mensual'} - ${chargeLabel}`

  const payment = await db.payment.create({
    data: {
      clientId,
      subscriptionId: subscription.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      paymentMethod: 'pending',
      description,
      dueDate: firstChargeDate,
    },
  })

  // Aplicar cuotas de almacenamiento del plan (restringe la biblioteca de inmediato)
  await applyPlanQuotasToClient(clientId, plan, db)

  return { subscription, payment, trialDays, trialEndsAt, isTrial }
}

/**
 * Notifica al administrador por email cuando se registra un cliente nuevo.
 * El destino se configura en /admin/settings (AppConfig.adminNotifyEmail).
 * Fallback: ADMIN_NOTIFY_EMAIL (env) o felipevegaesparza@gmail.com.
 *
 * `seed` refleja el resultado de sembrar el contenido por defecto del AutoDJ
 * (null si el plan no incluye radio), para que el admin pueda reintentar.
 */
export async function notifyAdminNewSignup(info: {
  name: string
  email: string
  planName?: string
  seed?: { ok: boolean; error?: string } | null
}) {
  const config = await prisma.appConfig.findFirst({ select: { adminNotifyEmail: true } })
  const to = config?.adminNotifyEmail || process.env.ADMIN_NOTIFY_EMAIL || 'felipevegaesparza@gmail.com'
  if (!to) return

  const panelUrl = process.env.NEXTAUTH_URL || 'https://panelipstream.cl'
  const planLabel = info.planName ? ` · Plan: <strong>${info.planName}</strong>` : ' · Sin plan'
  const seedLabel = info.seed
    ? info.seed.ok
      ? '<p style="margin:12px 0 0;color:#059669">Contenido por defecto del AutoDJ: sembrado correctamente.</p>'
      : `<p style="margin:12px 0 0;color:#dc2626">Contenido por defecto del AutoDJ: falló al sembrar (${info.seed.error || 'error desconocido'}). Reintentar desde el panel.</p>`
    : ''

  const html = `
<div style="background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827">
  <div style="max-width:520px;margin:0 auto">
    <h2 style="margin:0 0 4px">IPStream</h2>
    <p style="color:#6b7280;margin:0 0 16px">Nuevo registro de cliente 🎉</p>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px">
      <p style="margin:0 0 8px"><strong>Nombre:</strong> ${info.name}</p>
      <p style="margin:0 0 8px"><strong>Email:</strong> ${info.email}</p>
      <p style="margin:0">${planLabel}</p>
      ${seedLabel}
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
