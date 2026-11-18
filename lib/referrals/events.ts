// =====================================================
// Programa de referidos — notificaciones del panel
// =====================================================

import { formatCurrency } from '@/lib/billing-format'
import { notifyClient } from '@/lib/notifications'
import { NOTIFICATION_TYPE } from './constants'

const REFERRALS_LINK = '/dashboard/referidos'

export async function notifyReferralRegistered(
  params: { referralId: string; referrerClientId: string; referredName: string },
  db: any
) {
  return notifyClient(
    params.referrerClientId,
    {
      type: NOTIFICATION_TYPE.REFERRAL_REGISTERED,
      title: 'Nuevo referido registrado',
      message: `${params.referredName} creó su cuenta con tu enlace de referido.`,
      link: REFERRALS_LINK,
      eventKey: `referral:${params.referralId}:registered`,
    },
    db
  )
}

export async function notifyReferralFirstPayment(
  params: { referralId: string; referrerClientId: string; referredName: string },
  db: any
) {
  return notifyClient(
    params.referrerClientId,
    {
      type: NOTIFICATION_TYPE.REFERRAL_FIRST_PAYMENT,
      title: 'Tu referido pagó su primera mensualidad',
      message: `${params.referredName} completó su primer pago. Falta un pago para que el referido cuente.`,
      link: REFERRALS_LINK,
      eventKey: `referral:${params.referralId}:first_paid`,
    },
    db
  )
}

export async function notifyReferralValid(
  params: { referralId: string; referrerClientId: string; referredName: string },
  db: any
) {
  return notifyClient(
    params.referrerClientId,
    {
      type: NOTIFICATION_TYPE.REFERRAL_VALID,
      title: '¡Referido válido!',
      message: `${params.referredName} completó sus dos pagos. Ya suma para tu próximo mes gratis.`,
      link: REFERRALS_LINK,
      eventKey: `referral:${params.referralId}:valid`,
    },
    db
  )
}

export async function notifyRewardGenerated(
  params: {
    rewardId: string
    clientId: string
    months: number
    amount: number
    currency: string
  },
  db: any
) {
  return notifyClient(
    params.clientId,
    {
      type: NOTIFICATION_TYPE.REWARD_GENERATED,
      title: 'Ganaste un mes gratis',
      message: `Se generó una recompensa de ${params.months} mes(es) por ${formatCurrency(
        params.amount,
        params.currency
      )}.`,
      link: REFERRALS_LINK,
      eventKey: `reward:${params.rewardId}:created`,
    },
    db
  )
}

export async function notifyCreditApplied(
  params: {
    rewardId: string
    paymentId: string
    clientId: string
    amount: number
    currency: string
    remaining: number
  },
  db: any
) {
  return notifyClient(
    params.clientId,
    {
      type: NOTIFICATION_TYPE.CREDIT_APPLIED,
      title: 'Mes gratis aplicado',
      message: `Se aplicó ${formatCurrency(params.amount, params.currency)} de crédito a tu renovación. Saldo restante: ${formatCurrency(
        Math.max(0, params.remaining),
        params.currency
      )}.`,
      link: '/dashboard/payments',
      eventKey: `credit:${params.rewardId}:${params.paymentId}`,
    },
    db
  )
}

export async function notifyAdminChange(
  params: {
    clientId: string
    referenceId: string
    action: string
    reason?: string | null
  },
  db: any
) {
  return notifyClient(
    params.clientId,
    {
      type: NOTIFICATION_TYPE.ADMIN_CHANGE,
      title: 'Cambio en tu programa de referidos',
      message:
        params.action === 'reward_voided'
          ? `Una recompensa fue anulada. ${params.reason ? `Motivo: ${params.reason}` : ''}`.trim()
          : params.action === 'referral_rejected'
            ? `Un referido fue rechazado. ${params.reason ? `Motivo: ${params.reason}` : ''}`.trim()
            : 'Un administrador actualizó tu programa de referidos.',
      link: REFERRALS_LINK,
      eventKey: `admin:${params.referenceId}:${params.action}:${Date.now()}`,
    },
    db
  )
}
