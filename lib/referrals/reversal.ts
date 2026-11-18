// =====================================================
// Programa de referidos — reversión por reembolso/contracargo
// =====================================================

import { prisma } from '@/lib/prisma'
import { recordReferralAudit } from './audit'
import { LEDGER_TYPE, REFERRAL_FLAG_REASON, REFERRAL_STATUS } from './constants'

function runInTransaction<T>(db: any, work: (tx: any) => Promise<T>): Promise<T> {
  if (typeof db.$transaction !== 'function') return work(db)
  return db.$transaction(async (tx: any) => work(tx), {
    isolationLevel: 'Serializable',
  })
}

/**
 * Procesa la reversión de un pago: saca del conteo al referido que ese pago
 * validó y deja sus recompensas en revisión. No anula recompensas solo.
 */
export async function handlePaymentReversed(
  paymentId: string,
  db: any = prisma,
  actor: { userId?: string | null; role: string; ipAddress?: string | null } = {
    role: 'system',
  }
) {
  return runInTransaction(db, async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        clientId: true,
        amount: true,
        currency: true,
        creditApplied: true,
        subscriptionId: true,
        status: true,
      },
    })
    if (!payment) return { referralAffected: false, rewardsFlagged: 0, creditReversed: 0 }

    let referralAffected = false
    let rewardsFlagged = 0

    const referralPayment = await tx.referralPayment.findUnique({
      where: { paymentId },
      include: { referral: true },
    })

    if (referralPayment?.referral) {
      const referral = referralPayment.referral
      const before = {
        status: referral.status,
        flagged: referral.flagged,
        flagReason: referral.flagReason,
        validatedAt: referral.validatedAt,
      }

      await tx.referral.update({
        where: { id: referral.id },
        data: {
          flagged: true,
          flagReason: REFERRAL_FLAG_REASON.PAYMENT_REFUNDED,
          status:
            referralPayment.role === 'second'
              ? REFERRAL_STATUS.PENDING_SECOND_PAYMENT
              : REFERRAL_STATUS.PENDING_FIRST_PAYMENT,
          validatedAt: null,
        },
      })

      const rewards = await tx.referralReward.findMany({
        where: { referralId: referral.id, status: { not: 'voided' } },
        select: { id: true, status: true, reviewRequired: true },
      })
      for (const reward of rewards) {
        await tx.referralReward.update({
          where: { id: reward.id },
          data: { reviewRequired: true },
        })
        rewardsFlagged++
      }

      await recordReferralAudit(
        {
          actor: { userId: actor.userId ?? null, role: actor.role },
          action: 'referral.payment_refunded',
          clientId: referral.referrerClientId,
          referralId: referral.id,
          before,
          after: { flagged: true, status: 'pending_second_payment' },
          reason: 'payment_refunded',
          ipAddress: actor.ipAddress ?? null,
        },
        tx
      )
      referralAffected = true
    }

    // Si el pago reembolsado había sido cubierto con crédito, se devuelve el
    // saldo aplicado para que no quede consumido por un pago anulado.
    const applications = await tx.referralCreditLedger.findMany({
      where: { paymentId, type: LEDGER_TYPE.APPLICATION },
    })
    let creditReversed = 0
    for (const application of applications) {
      const amount = Math.abs(Number(application.amount || 0))
      if (amount <= 0) continue
      if (typeof tx.referralCreditLedger.findFirst === 'function') {
        const already = await tx.referralCreditLedger.findFirst({
          where: {
            paymentId,
            rewardId: application.rewardId,
            type: LEDGER_TYPE.ADJUSTMENT,
          },
          select: { id: true },
        })
        if (already) continue
      }
      await tx.referralCreditLedger.create({
        data: {
          clientId: application.clientId,
          rewardId: application.rewardId,
          paymentId,
          type: LEDGER_TYPE.ADJUSTMENT,
          amount,
          currency: application.currency,
          fxRate: application.fxRate ?? null,
          note: 'Reversión de crédito por pago reembolsado',
        },
      })
      creditReversed += amount

      if (application.rewardId) {
        const reward = await tx.referralReward.findUnique({
          where: { id: application.rewardId },
        })
        if (reward && reward.status !== 'voided') {
          const remaining = Math.min(
            reward.amount,
            Number(reward.remainingAmount || 0) + amount
          )
          await tx.referralReward.update({
            where: { id: reward.id },
            data: {
              remainingAmount: remaining,
              status: remaining > 0.005 ? 'available' : 'applied',
              appliedAt: remaining > 0.005 ? null : reward.appliedAt,
            },
          })
        }
      }
    }

    if (creditReversed > 0) {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          creditApplied: 0,
          status: 'refunded',
        },
      })
    }

    return { referralAffected, rewardsFlagged, creditReversed }
  })
}
