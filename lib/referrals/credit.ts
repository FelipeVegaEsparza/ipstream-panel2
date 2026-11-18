// =====================================================
// Programa de referidos — aplicación automática de crédito
// =====================================================

import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_STATUS } from '@/lib/subscription-status'
import {
  DEFAULT_REFERRAL_FX_USD_CLP,
  LEDGER_TYPE,
  MAX_CREDIT_CYCLES_PER_RUN,
  REWARD_STATUS,
} from './constants'
import { addCycle } from './payment-rules'
import { convertCurrency, roundMoney } from './rewards'
import { notifyCreditApplied } from './events'

const EPSILON = 0.005

export async function getCreditBalance(
  clientId: string,
  currency: string,
  db: any = prisma
): Promise<number> {
  const result = await db.referralCreditLedger.aggregate({
    where: { clientId, currency },
    _sum: { amount: true },
  })
  return Number(result?._sum?.amount || 0)
}

export async function getCreditBalances(
  clientId: string,
  db: any = prisma
): Promise<Array<{ currency: string; amount: number }>> {
  const rows = await db.referralCreditLedger.groupBy({
    by: ['currency'],
    where: { clientId },
    _sum: { amount: true },
  })
  return (rows || [])
    .map((row: any) => ({
      currency: row.currency,
      amount: Number(row?._sum?.amount || 0),
    }))
    .filter((row: any) => Math.abs(row.amount) > EPSILON)
}

function runInTransaction<T>(db: any, work: (tx: any) => Promise<T>): Promise<T> {
  if (typeof db.$transaction !== 'function') return work(db)
  return db.$transaction(async (tx: any) => work(tx), {
    isolationLevel: 'Serializable',
  })
}

async function getFxRate(tx: any): Promise<number> {
  try {
    const config = await tx.appConfig.findFirst({ select: { referralFxUsdClp: true } })
    if (Number(config?.referralFxUsdClp) > 0) return Number(config.referralFxUsdClp)
  } catch {
    // Sin configuración: se usa la tasa por defecto.
  }
  return Number(process.env.REFERRAL_FX_USD_CLP) > 0
    ? Number(process.env.REFERRAL_FX_USD_CLP)
    : DEFAULT_REFERRAL_FX_USD_CLP
}

async function settlePaymentWithCredit(tx: any, payment: any, now: Date) {
  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      paymentMethod: 'referral_credit',
      paidAt: now,
      transactionId: `REFERRAL_CREDIT_${payment.id}`,
      creditApplied: payment.amount,
      creditCurrency: payment.currency,
    },
  })

  if (!payment.subscriptionId) return null

  const subscription = await tx.subscription.findUnique({
    where: { id: payment.subscriptionId },
    include: { plan: true },
  })
  if (!subscription) return null

  const interval = subscription.plan?.interval || 'monthly'
  const nextDueDate = addCycle(payment.dueDate, interval, 1)

  await tx.payment.deleteMany({
    where: {
      subscriptionId: payment.subscriptionId,
      status: 'pending',
      dueDate: { lte: payment.dueDate },
      id: { not: payment.id },
    },
  })

  const existingNext = await tx.payment.findFirst({
    where: {
      subscriptionId: payment.subscriptionId,
      status: 'pending',
      dueDate: nextDueDate,
    },
  })

  const nextPayment =
    existingNext ||
    (await tx.payment.create({
      data: {
        clientId: payment.clientId,
        subscriptionId: payment.subscriptionId,
        amount: subscription.plan?.price ?? payment.amount,
        currency: subscription.plan?.currency ?? payment.currency,
        status: 'pending',
        paymentMethod: 'pending',
        description: `Pago ${interval === 'yearly' ? 'anual' : 'mensual'} - ${nextDueDate.toLocaleDateString(
          'es-ES',
          { month: 'long', year: 'numeric' }
        )}`,
        dueDate: nextDueDate,
        paidAt: null,
        transactionId: null,
      },
    }))

  await tx.subscription.update({
    where: { id: payment.subscriptionId },
    data: {
      endDate: addCycle(nextDueDate, interval, 1),
      status: SUBSCRIPTION_STATUS.ACTIVE,
      trialEndsAt: null,
    },
  })

  return nextPayment
}

/**
 * Aplica el crédito disponible a los próximos pagos impagos del cliente.
 * - Nunca toca pagos ya confirmados ni períodos anteriores a la recompensa.
 * - Si cubre el total, el pago queda cubierto y la suscripción avanza.
 * - Es idempotente: el índice único (rewardId, paymentId) evita repetir.
 */
export async function applyReferralCredits(
  clientId: string,
  db: any = prisma
): Promise<{ applied: number; cyclesSettled: number }> {
  return runInTransaction(db, async (tx) => {
    const rewards = await tx.referralReward.findMany({
      where: {
        referrerClientId: clientId,
        status: REWARD_STATUS.AVAILABLE,
        remainingAmount: { gt: 0 },
      },
      orderBy: { generatedAt: 'asc' },
    })
    if (rewards.length === 0) return { applied: 0, cyclesSettled: 0 }

    const balances = new Map<string, number>()
    for (const reward of rewards) {
      if (balances.has(reward.currency)) continue
      balances.set(reward.currency, await getCreditBalance(clientId, reward.currency, tx))
    }

    const earliestGeneratedAt = rewards.reduce(
      (min: Date, reward: any) =>
        new Date(reward.generatedAt) < min ? new Date(reward.generatedAt) : min,
      new Date(rewards[0].generatedAt)
    )

    const payments = await tx.payment.findMany({
      where: {
        clientId,
        status: { in: ['pending', 'failed'] },
      },
      orderBy: { dueDate: 'asc' },
    })

    const queue = payments.filter((payment: any) => {
      if (payment.status !== 'pending' && payment.status !== 'failed') return false
      const due = new Date(payment.dueDate)
      return due >= earliestGeneratedAt && Number(payment.creditApplied || 0) < payment.amount
    })

    const fx = await getFxRate(tx)
    const now = new Date()
    let applied = 0
    let cyclesSettled = 0

    let index = 0
    while (index < queue.length && cyclesSettled < MAX_CREDIT_CYCLES_PER_RUN) {
      const payment = queue[index++]
      let net = payment.amount - Number(payment.creditApplied || 0)
      if (net <= EPSILON) continue

      for (const reward of rewards) {
        if (net <= EPSILON) break
        if (reward.remainingAmount <= EPSILON) continue
        const balance = balances.get(reward.currency) || 0
        if (balance <= EPSILON) continue

        const available = convertCurrency(
          Math.min(reward.remainingAmount, balance),
          reward.currency,
          payment.currency,
          fx
        )
        if (available == null || available <= EPSILON) continue

        const paymentCredit = Math.min(net, available)
        const debit = Math.min(
          reward.remainingAmount,
          roundMoney(
            convertCurrency(paymentCredit, payment.currency, reward.currency, fx) ?? 0,
            reward.currency
          )
        )
        if (debit <= EPSILON) continue

        try {
          await tx.referralCreditLedger.create({
            data: {
              clientId,
              rewardId: reward.id,
              paymentId: payment.id,
              type: LEDGER_TYPE.APPLICATION,
              amount: -debit,
              currency: reward.currency,
              fxRate: reward.currency === payment.currency ? null : fx,
            },
          })
        } catch (error: any) {
          if (error?.code === 'P2002') continue
          throw error
        }

        reward.remainingAmount = Math.max(0, reward.remainingAmount - debit)
        balances.set(reward.currency, balance - debit)
        await tx.referralReward.update({
          where: { id: reward.id },
          data: {
            remainingAmount: reward.remainingAmount,
            ...(reward.remainingAmount <= EPSILON
              ? { status: REWARD_STATUS.APPLIED, appliedAt: now, subscriptionId: payment.subscriptionId ?? null }
              : {}),
          },
        })

        payment.creditApplied = Number(payment.creditApplied || 0) + paymentCredit
        net -= paymentCredit
        applied += debit

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            creditApplied: payment.creditApplied,
            creditCurrency: payment.currency,
          },
        })

        try {
          await notifyCreditApplied(
            {
              rewardId: reward.id,
              paymentId: payment.id,
              clientId,
              amount: debit,
              currency: reward.currency,
              remaining: balances.get(reward.currency) || 0,
            },
            tx
          )
        } catch (error) {
          console.error('[referrals] No se pudo notificar el crédito aplicado:', error)
        }
      }

      if (Number(payment.creditApplied || 0) >= payment.amount - EPSILON) {
        const nextPayment = await settlePaymentWithCredit(tx, payment, now)
        cyclesSettled++
        if (nextPayment) {
          queue.push(nextPayment)
        }
      }
    }

    return { applied, cyclesSettled }
  })
}
