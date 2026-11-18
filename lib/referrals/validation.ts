// =====================================================
// Programa de referidos — validación desde pagos reales
// =====================================================

import { prisma } from '@/lib/prisma'
import { REFERRAL_STATUS, type ReferralStatus } from './constants'
import { expectedCycleDates, isValidationPayment, selectValidationPayments } from './payment-rules'
import { notifyReferralFirstPayment, notifyReferralValid } from './events'

export { isValidationPayment }

export interface RecalculateReferralResult {
  referralId: string
  previousStatus: ReferralStatus
  status: ReferralStatus
  firstConfirmed: boolean
  secondConfirmed: boolean
  becameValid: boolean
}

function cycleKey(date: Date, interval: string): string {
  if (interval === 'yearly') return String(date.getFullYear())
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function hasPaymentForCycle(
  payments: Array<{ dueDate?: Date | string | null }>,
  startDate: Date,
  interval: string,
  cycleIndex: number
): boolean {
  const [target] = expectedCycleDates(startDate, interval, cycleIndex + 1).slice(-1)
  if (!target) return false
  const key = cycleKey(target, interval)
  return payments.some((p) => p.dueDate && cycleKey(new Date(p.dueDate), interval) === key)
}

/**
 * Recalcula el estado de un referido a partir de sus pagos. Es idempotente y
 * nunca confía en estados enviados por el frontend.
 */
export async function recalculateReferral(
  referralId: string,
  db: any = prisma
): Promise<RecalculateReferralResult | null> {
  const referral = await db.referral.findUnique({
    where: { id: referralId },
    include: {
      referred: {
        select: {
          id: true,
          name: true,
          subscription: {
            include: { plan: { select: { id: true, name: true, interval: true } } },
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              paidAt: true,
              paymentMethod: true,
              transactionId: true,
              creditApplied: true,
              dueDate: true,
            },
            orderBy: { dueDate: 'asc' },
          },
        },
      },
    },
  })
  if (!referral) return null

  const previousStatus = referral.status as ReferralStatus
  if (previousStatus === REFERRAL_STATUS.REJECTED) {
    return {
      referralId,
      previousStatus,
      status: previousStatus,
      firstConfirmed: Boolean(referral.firstPaidAt),
      secondConfirmed: Boolean(referral.secondPaidAt),
      becameValid: false,
    }
  }

  // Un referido ya validado conserva su condición: los pagos históricos pueden
  // desaparecer al regenerar cuotas, pero la validez ya ganada no se pierde.
  // Solo la revisión administrativa o una reversión lo sacan del estado válido.
  if (previousStatus === REFERRAL_STATUS.VALID && !referral.flagged) {
    return {
      referralId,
      previousStatus,
      status: REFERRAL_STATUS.VALID,
      firstConfirmed: true,
      secondConfirmed: true,
      becameValid: false,
    }
  }

  const subscription = referral.referred?.subscription || null
  if (!subscription) {
    const status = REFERRAL_STATUS.PENDING_CONTRACT
    if (previousStatus !== status) {
      await db.referral.update({
        where: { id: referralId },
        data: { status },
      })
    }
    return {
      referralId,
      previousStatus,
      status,
      firstConfirmed: false,
      secondConfirmed: false,
      becameValid: false,
    }
  }

  const interval = subscription.plan?.interval || 'monthly'
  const selection = selectValidationPayments(referral.referred.payments, {
    startDate: subscription.startDate,
    interval,
    cycles: 2,
  })

  const firstPaidAt = selection.first?.paidAt ? new Date(selection.first.paidAt) : null
  const secondPaidAt = selection.second?.paidAt ? new Date(selection.second.paidAt) : null

  let status: ReferralStatus
  if (!selection.firstConfirmed) {
    status = REFERRAL_STATUS.PENDING_FIRST_PAYMENT
  } else if (!selection.secondConfirmed) {
    status = hasPaymentForCycle(
      referral.referred.payments,
      new Date(subscription.startDate),
      interval,
      1
    )
      ? REFERRAL_STATUS.PENDING_SECOND_PAYMENT
      : REFERRAL_STATUS.FIRST_PAYMENT_CONFIRMED
  } else if (referral.flagged) {
    status = REFERRAL_STATUS.PENDING_SECOND_PAYMENT
  } else {
    status = REFERRAL_STATUS.VALID
  }

  const validatedAt =
    status === REFERRAL_STATUS.VALID ? referral.validatedAt || new Date() : null

  await db.referral.update({
    where: { id: referralId },
    data: {
      status,
      firstPaidAt: firstPaidAt || referral.firstPaidAt || null,
      secondPaidAt: secondPaidAt || referral.secondPaidAt || null,
      validatedAt,
    },
  })

  // Registra los pagos que respaldan la validación (idempotente por paymentId).
  for (const [role, payment] of [
    ['first', selection.first],
    ['second', selection.second],
  ] as const) {
    if (!payment?.id || !payment.paidAt) continue
    await db.referralPayment.upsert({
      where: { paymentId: payment.id },
      update: {
        referralId,
        role,
        amount: Number(payment.amount || 0),
        currency: payment.currency || 'CLP',
        paidAt: new Date(payment.paidAt),
      },
      create: {
        referralId,
        paymentId: payment.id,
        role,
        amount: Number(payment.amount || 0),
        currency: payment.currency || 'CLP',
        paidAt: new Date(payment.paidAt),
      },
    })
  }

  const firstNewlyConfirmed =
    selection.firstConfirmed && !referral.firstPaidAt && previousStatus !== REFERRAL_STATUS.VALID
  const becameValid =
    status === REFERRAL_STATUS.VALID && previousStatus !== REFERRAL_STATUS.VALID

  if (firstNewlyConfirmed) {
    try {
      await notifyReferralFirstPayment(
        {
          referralId,
          referrerClientId: referral.referrerClientId,
          referredName: referral.referred.name,
        },
        db
      )
    } catch (error) {
      console.error('[referrals] No se pudo notificar el primer pago:', error)
    }
  }

  if (becameValid) {
    try {
      await notifyReferralValid(
        {
          referralId,
          referrerClientId: referral.referrerClientId,
          referredName: referral.referred.name,
        },
        db
      )
    } catch (error) {
      console.error('[referrals] No se pudo notificar el referido válido:', error)
    }

    try {
      const { generateRewardsForReferrer } = await import('./rewards')
      await generateRewardsForReferrer(referral.referrerClientId, db, referralId)
    } catch (error) {
      console.error('[referrals] No se pudieron generar recompensas:', error)
    }
  }

  return {
    referralId,
    previousStatus,
    status,
    firstConfirmed: selection.firstConfirmed,
    secondConfirmed: selection.secondConfirmed,
    becameValid,
  }
}

/** Hook invocado después de confirmar un pago. Nunca lanza al llamador. */
export async function onPaymentConfirmed(
  paymentId: string,
  db: any = prisma
): Promise<void> {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, clientId: true },
    })
    if (!payment) return

    const referral = await db.referral.findUnique({
      where: { referredClientId: payment.clientId },
      select: { id: true },
    })
    if (referral) {
      await recalculateReferral(referral.id, db)
    }

    // Aplica créditos propios del cliente (si tiene recompensas disponibles).
    const { applyReferralCredits } = await import('./credit')
    await applyReferralCredits(payment.clientId, db)
  } catch (error) {
    console.error('[referrals] Hook de pago confirmado falló:', error)
  }
}
