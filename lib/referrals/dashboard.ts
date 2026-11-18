// =====================================================
// Programa de referidos — lectura para el dashboard
// =====================================================

import { prisma } from '@/lib/prisma'
import { buildReferralLink, ensureReferralCode, getReferralBaseUrl } from './codes'
import { getReferrerEligibility, eligibilityMessage } from './eligibility'
import { getCreditBalances } from './credit'
import { computeReferralProgress } from './rewards'
import {
  REFERRAL_FLAG_LABELS,
  REFERRAL_STATUS,
  REFERRAL_STATUS_LABELS,
  REWARD_STATUS_LABELS,
  type ReferralStatus,
} from './constants'

export interface ReferralDashboardReferral {
  id: string
  referredName: string
  registeredAt: string
  planName: string | null
  status: string
  statusLabel: string
  paymentProgress: number
  validatedAt: string | null
  flagged: boolean
  flagLabel: string | null
}

export interface ReferralDashboardReward {
  id: string
  generatedAt: string
  months: number
  amount: number
  currency: string
  status: string
  statusLabel: string
  appliedAt: string | null
}

export interface ReferralDashboardData {
  eligible: boolean
  eligibilityReason: string
  eligibilityMessage: string
  code: string | null
  link: string | null
  summary: {
    totalReferred: number
    valid: number
    pending: number
    rejected: number
    monthsAccumulated: number
    monthsAvailable: number
    monthsUsed: number
  }
  progress: {
    validCount: number
    remainder: number
    remainingToNext: number
    nextRewardAt: number | null
  }
  creditBalances: Array<{ currency: string; amount: number }>
  referrals: ReferralDashboardReferral[]
  rewards: ReferralDashboardReward[]
}

export async function getReferralDashboard(
  clientId: string,
  db: any = prisma
): Promise<ReferralDashboardData> {
  const eligibility = await getReferrerEligibility(clientId, db)

  let code: string | null = null
  let link: string | null = null
  if (eligibility.eligible) {
    try {
      code = await ensureReferralCode(clientId, db)
      link = buildReferralLink(code, await getReferralBaseUrl(db))
    } catch (error) {
      console.error('[referrals] No se pudo preparar el código:', error)
    }
  }

  const [referrals, rewards, creditBalances] = await Promise.all([
    db.referral.findMany({
      where: { referrerClientId: clientId },
      orderBy: { registeredAt: 'desc' },
      include: {
        referred: {
          select: {
            name: true,
            plan: { select: { name: true } },
          },
        },
        payments: { select: { role: true } },
      },
    }),
    db.referralReward.findMany({
      where: { referrerClientId: clientId },
      orderBy: { generatedAt: 'desc' },
    }),
    getCreditBalances(clientId, db),
  ])

  const valid = referrals.filter((r: any) => r.status === REFERRAL_STATUS.VALID).length
  const rejected = referrals.filter((r: any) => r.status === REFERRAL_STATUS.REJECTED).length
  const pending = referrals.length - valid - rejected
  const progress = computeReferralProgress(valid)

  const activeRewards = rewards.filter(
    (r: any) => r.status !== 'voided' && r.status !== 'expired'
  )
  const monthsAvailable = activeRewards.filter(
    (r: any) => r.status === 'available' && Number(r.remainingAmount) > 0.005
  ).length
  const monthsUsed = activeRewards.filter(
    (r: any) => r.status === 'applied' || Number(r.remainingAmount) <= 0.005
  ).length

  return {
    eligible: eligibility.eligible,
    eligibilityReason: eligibility.reason,
    eligibilityMessage: eligibilityMessage(eligibility.reason),
    code,
    link,
    summary: {
      totalReferred: referrals.length,
      valid,
      pending,
      rejected,
      monthsAccumulated: monthsAvailable + monthsUsed,
      monthsAvailable,
      monthsUsed,
    },
    progress: {
      validCount: progress.validCount,
      remainder: progress.remainder,
      remainingToNext: progress.remainingToNext,
      nextRewardAt: progress.nextRewardAt,
    },
    creditBalances,
    referrals: referrals.map((referral: any) => {
      const status = referral.status as ReferralStatus
      return {
        id: referral.id,
        referredName: referral.referred?.name || 'Cliente',
        registeredAt: new Date(referral.registeredAt).toISOString(),
        planName: referral.referred?.plan?.name ?? null,
        status,
        statusLabel: REFERRAL_STATUS_LABELS[status] || status,
        paymentProgress: Math.min(2, referral.payments?.length || 0),
        validatedAt: referral.validatedAt
          ? new Date(referral.validatedAt).toISOString()
          : null,
        flagged: Boolean(referral.flagged),
        flagLabel: referral.flagReason
          ? REFERRAL_FLAG_LABELS[referral.flagReason] || null
          : null,
      }
    }),
    rewards: rewards.map((reward: any) => ({
      id: reward.id,
      generatedAt: new Date(reward.generatedAt).toISOString(),
      months: reward.months,
      amount: reward.amount,
      currency: reward.currency,
      status: reward.status,
      statusLabel: REWARD_STATUS_LABELS[reward.status as keyof typeof REWARD_STATUS_LABELS] || reward.status,
      appliedAt: reward.appliedAt ? new Date(reward.appliedAt).toISOString() : null,
    })),
  }
}
