// =====================================================
// Programa de referidos — recompensas (2 válidos = 1 mes)
// =====================================================

import { prisma } from '@/lib/prisma'
import {
  DEFAULT_REFERRAL_FX_USD_CLP,
  REFERRAL_REWARD_MONTHS,
  REWARD_STATUS,
} from './constants'
import { notifyRewardGenerated } from './events'

export interface PlanLike {
  id?: string | null
  name?: string | null
  price?: number | null
  currency?: string | null
  interval?: string | null
}

export interface PlanPriceLike {
  planId?: string
  currency: string
  amount: number
}

export interface ResolvedMonthlyPrice {
  amount: number
  currency: string
  source: 'plan_price' | 'plan_base' | 'plan_base_fx'
  fxRate: number | null
  originalAmount: number
  originalCurrency: string
  interval: string
}

export interface RewardValueResult {
  amount: number
  currency: string
  snapshot: Record<string, unknown>
}

export interface ReferralProgress {
  validCount: number
  rewardsEarned: number
  remainder: number
  remainingToNext: number
  nextRewardAt: number | null
}

export function computeReferralProgress(validCount: number): ReferralProgress {
  const safe = Math.max(0, Math.floor(validCount || 0))
  const rewardsEarned = Math.floor(safe / 2)
  const remainder = safe % 2
  return {
    validCount: safe,
    rewardsEarned,
    remainder,
    remainingToNext: remainder === 0 ? 2 : 1,
    nextRewardAt: remainder === 0 ? safe + 2 : safe + 1,
  }
}

export function monthsForInterval(interval: string | null | undefined): number {
  return interval === 'yearly' ? 12 : 1
}

export function monthlyAmount(amount: number, interval: string | null | undefined): number {
  return amount / monthsForInterval(interval)
}

export function roundMoney(amount: number, currency: string): number {
  if (currency === 'CLP') return Math.round(amount)
  return Math.round(amount * 100) / 100
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  fxUsdClp?: number | null
): number | null {
  if (from === to) return amount
  const rate = Number(fxUsdClp) > 0 ? Number(fxUsdClp) : DEFAULT_REFERRAL_FX_USD_CLP
  if (from === 'USD' && to === 'CLP') return amount * rate
  if (from === 'CLP' && to === 'USD') return amount / rate
  return null
}

export function resolveMonthlyPrice(
  plan: PlanLike | null | undefined,
  prices: PlanPriceLike[],
  targetCurrency: string,
  fxUsdClp?: number | null
): ResolvedMonthlyPrice | null {
  if (!plan || plan.price == null) return null
  const interval = plan.interval || 'monthly'
  const baseCurrency = plan.currency || 'CLP'
  const baseMonthly = monthlyAmount(Number(plan.price), interval)

  const direct = (prices || []).find(
    (p) => p.planId === plan.id && p.currency === targetCurrency
  )
  if (direct) {
    return {
      amount: monthlyAmount(Number(direct.amount), interval),
      currency: targetCurrency,
      source: 'plan_price',
      fxRate: null,
      originalAmount: Number(direct.amount),
      originalCurrency: targetCurrency,
      interval,
    }
  }

  if (baseCurrency === targetCurrency) {
    return {
      amount: baseMonthly,
      currency: targetCurrency,
      source: 'plan_base',
      fxRate: null,
      originalAmount: Number(plan.price),
      originalCurrency: baseCurrency,
      interval,
    }
  }

  const converted = convertCurrency(baseMonthly, baseCurrency, targetCurrency, fxUsdClp)
  if (converted == null) return null
  return {
    amount: converted,
    currency: targetCurrency,
    source: 'plan_base_fx',
    fxRate: Number(fxUsdClp) > 0 ? Number(fxUsdClp) : DEFAULT_REFERRAL_FX_USD_CLP,
    originalAmount: Number(plan.price),
    originalCurrency: baseCurrency,
    interval,
  }
}

export function computeRewardValue(input: {
  referrerPlan: PlanLike | null | undefined
  referrerPrices: PlanPriceLike[]
  referredPlan: PlanLike | null | undefined
  referredPrices: PlanPriceLike[]
  rewardCurrency: string
  fxUsdClp?: number | null
}): RewardValueResult | null {
  const referrerPrice = resolveMonthlyPrice(
    input.referrerPlan,
    input.referrerPrices,
    input.rewardCurrency,
    input.fxUsdClp
  )
  const referredPrice = resolveMonthlyPrice(
    input.referredPlan,
    input.referredPrices,
    input.rewardCurrency,
    input.fxUsdClp
  )

  const candidates = [referrerPrice, referredPrice].filter(
    (value): value is ResolvedMonthlyPrice => Boolean(value)
  )
  if (candidates.length === 0) return null

  const minimum = candidates.reduce((min, current) =>
    current.amount < min.amount ? current : min
  )
  const amount = roundMoney(minimum.amount, input.rewardCurrency)

  return {
    amount,
    currency: input.rewardCurrency,
    snapshot: {
      rewardCurrency: input.rewardCurrency,
      fxRate:
        candidates.find((c) => c.fxRate != null)?.fxRate ??
        (Number(input.fxUsdClp) > 0 ? Number(input.fxUsdClp) : null),
      computedAt: new Date().toISOString(),
      referrer: referrerPrice
        ? {
            planId: input.referrerPlan?.id ?? null,
            planName: input.referrerPlan?.name ?? null,
            ...referrerPrice,
          }
        : null,
      referred: referredPrice
        ? {
            planId: input.referredPlan?.id ?? null,
            planName: input.referredPlan?.name ?? null,
            ...referredPrice,
          }
        : null,
      selectedSource: minimum.source,
    },
  }
}

async function runSerializable<T>(db: any, work: (tx: any) => Promise<T>): Promise<T> {
  if (typeof db.$transaction !== 'function') return work(db)
  return db.$transaction(async (tx: any) => work(tx), {
    isolationLevel: 'Serializable',
  })
}

async function withClientLock<T>(db: any, clientId: string, work: (tx: any) => Promise<T>) {
  return runSerializable(db, async (tx) => {
    if (typeof tx.$queryRaw === 'function') {
      try {
        await tx.$queryRaw`SELECT id FROM clients WHERE id = ${clientId} FOR UPDATE`
      } catch {
        // En tests o motores sin lock se continúa; el índice único protege.
      }
    }
    return work(tx)
  })
}

/**
 * Genera las recompensas pendientes del referente según sus referidos válidos.
 * El slot `floor(validCount / 2) - 1` se crea una sola vez gracias al índice
 * único `(referrerClientId, slotIndex)`.
 */
export async function generateRewardsForReferrer(
  referrerClientId: string,
  db: any = prisma,
  triggerReferralId?: string
): Promise<{ created: number }> {
  return withClientLock(db, referrerClientId, async (tx) => {
    const validReferrals = await tx.referral.findMany({
      where: { referrerClientId, status: 'valid' },
      orderBy: [{ validatedAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, referredClientId: true, validatedAt: true },
    })

    const completedGroups = Math.floor(validReferrals.length / 2)
    if (completedGroups === 0) return { created: 0 }

    const existing = await tx.referralReward.findMany({
      where: { referrerClientId },
      select: { slotIndex: true },
    })
    const existingSlots = new Set<number>(existing.map((r: any) => r.slotIndex))

    let created = 0
    for (let slot = 0; slot < completedGroups; slot++) {
      if (existingSlots.has(slot)) continue

      const completing =
        triggerReferralId && slot === completedGroups - 1
          ? validReferrals.find((r: any) => r.id === triggerReferralId)
          : null
      const completingReferral =
        completing || validReferrals[slot * 2 + 1] || validReferrals[validReferrals.length - 1]
      if (!completingReferral) continue

      const referrer = await tx.client.findUnique({
        where: { id: referrerClientId },
        select: {
          id: true,
          billingCurrency: true,
          plan: {
            select: { id: true, name: true, price: true, currency: true, interval: true },
          },
        },
      })
      const referred = await tx.client.findUnique({
        where: { id: completingReferral.referredClientId },
        select: {
          id: true,
          billingCurrency: true,
          plan: {
            select: { id: true, name: true, price: true, currency: true, interval: true },
          },
        },
      })
      if (!referrer) continue

      const planIds = [referrer.plan?.id, referred?.plan?.id].filter(Boolean) as string[]
      const prices = planIds.length
        ? await tx.planPrice.findMany({
            where: { planId: { in: planIds } },
            select: { planId: true, currency: true, amount: true },
          })
        : []

      const config = await tx.appConfig.findFirst({
        select: { referralFxUsdClp: true },
      })
      const fxUsdClp = config?.referralFxUsdClp ?? null
      const rewardCurrency =
        referrer.billingCurrency || referrer.plan?.currency || 'CLP'

      const value = computeRewardValue({
        referrerPlan: referrer.plan,
        referrerPrices: prices.filter((p: any) => p.planId === referrer.plan?.id),
        referredPlan: referred?.plan,
        referredPrices: prices.filter((p: any) => p.planId === referred?.plan?.id),
        rewardCurrency,
        fxUsdClp,
      })

      if (!value) {
        await tx.referralAuditLog.create({
          data: {
            actorRole: 'system',
            action: 'reward.skipped',
            clientId: referrerClientId,
            referralId: completingReferral.id,
            reason: 'missing_plan_price',
          },
        })
        continue
      }

      let reward: any = null
      try {
        reward = await tx.referralReward.create({
          data: {
            referrerClientId,
            referralId: completingReferral.id,
            slotIndex: slot,
            months: REFERRAL_REWARD_MONTHS,
            amount: value.amount,
            currency: value.currency,
            remainingAmount: value.amount,
            status: REWARD_STATUS.AVAILABLE,
            priceSnapshot: value.snapshot as any,
          },
        })
      } catch (error: any) {
        if (error?.code === 'P2002') continue
        throw error
      }

      await tx.referralCreditLedger.create({
        data: {
          clientId: referrerClientId,
          rewardId: reward.id,
          type: 'reward',
          amount: value.amount,
          currency: value.currency,
          note: `Recompensa por ${REFERRAL_REWARD_MONTHS} mes(es) de referidos`,
        },
      })

      created++
      try {
        await notifyRewardGenerated(
          {
            rewardId: reward.id,
            clientId: referrerClientId,
            months: REFERRAL_REWARD_MONTHS,
            amount: value.amount,
            currency: value.currency,
          },
          tx
        )
      } catch (error) {
        console.error('[referrals] No se pudo notificar la recompensa:', error)
      }
    }

    if (created > 0) {
      try {
        const { applyReferralCredits } = await import('./credit')
        await applyReferralCredits(referrerClientId, tx)
      } catch (error) {
        console.error('[referrals] No se pudo aplicar el crédito generado:', error)
      }
    }

    return { created }
  })
}
