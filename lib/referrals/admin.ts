// =====================================================
// Programa de referidos — operaciones administrativas
// =====================================================

import { prisma } from '@/lib/prisma'
import { recordReferralAudit, type ReferralAuditActor } from './audit'
import { LEDGER_TYPE, REFERRAL_STATUS } from './constants'
import { notifyAdminChange } from './events'
import { recalculateReferral } from './validation'

function runInTransaction<T>(db: any, work: (tx: any) => Promise<T>): Promise<T> {
  if (typeof db.$transaction !== 'function') return work(db)
  return db.$transaction(async (tx: any) => work(tx), {
    isolationLevel: 'Serializable',
  })
}

export interface AdminActor extends ReferralAuditActor {
  ipAddress?: string | null
}

/** Anula una recompensa y registra la deuda si ya había sido consumida. */
export async function voidReward(
  rewardId: string,
  reason: string,
  actor: AdminActor,
  db: any = prisma
) {
  const trimmed = (reason || '').trim()
  if (!trimmed) throw new Error('El motivo de la anulación es obligatorio')

  return runInTransaction(db, async (tx) => {
    const reward = await tx.referralReward.findUnique({ where: { id: rewardId } })
    if (!reward) throw new Error('Recompensa no encontrada')
    if (reward.status === 'voided') return { reward, alreadyVoided: true }

    const remaining = Number(reward.remainingAmount || 0)
    const consumed = Math.max(0, Number(reward.amount || 0) - remaining)

    if (remaining > 0.005) {
      await tx.referralCreditLedger.create({
        data: {
          clientId: reward.referrerClientId,
          rewardId: reward.id,
          type: LEDGER_TYPE.VOID,
          amount: -remaining,
          currency: reward.currency,
          note: `Anulación de recompensa: ${trimmed}`,
        },
      })
    }
    if (consumed > 0.005) {
      await tx.referralCreditLedger.create({
        data: {
          clientId: reward.referrerClientId,
          rewardId: reward.id,
          type: LEDGER_TYPE.DEBT,
          amount: -consumed,
          currency: reward.currency,
          note: `Deuda por recompensa consumida anulada: ${trimmed}`,
        },
      })
    }

    const updated = await tx.referralReward.update({
      where: { id: rewardId },
      data: {
        remainingAmount: 0,
        status: 'voided',
        voidedAt: new Date(),
        voidReason: trimmed,
        reviewRequired: false,
      },
    })

    await recordReferralAudit(
      {
        actor: { userId: actor.userId ?? null, role: actor.role },
        action: 'reward.voided',
        clientId: reward.referrerClientId,
        referralId: reward.referralId,
        rewardId: reward.id,
        before: {
          status: reward.status,
          amount: reward.amount,
          remainingAmount: reward.remainingAmount,
        },
        after: { status: 'voided', remainingAmount: 0, consumed },
        reason: trimmed,
        ipAddress: actor.ipAddress ?? null,
      },
      tx
    )

    try {
      await notifyAdminChange(
        {
          clientId: reward.referrerClientId,
          referenceId: reward.id,
          action: 'reward_voided',
          reason: trimmed,
        },
        tx
      )
    } catch (error) {
      console.error('[referrals] No se pudo notificar la anulación:', error)
    }

    return { reward: updated, alreadyVoided: false, consumed }
  })
}

/** Resuelve la revisión de un referido (aprobar o rechazar). */
export async function resolveReferralReview(
  referralId: string,
  decision: 'approve' | 'reject',
  reason: string,
  actor: AdminActor,
  db: any = prisma
) {
  const trimmed = (reason || '').trim()
  if (decision === 'reject' && !trimmed) {
    throw new Error('El motivo del rechazo es obligatorio')
  }

  return runInTransaction(db, async (tx) => {
    const referral = await tx.referral.findUnique({
      where: { id: referralId },
      select: {
        id: true,
        status: true,
        flagged: true,
        flagReason: true,
        referrerClientId: true,
        referredClientId: true,
      },
    })
    if (!referral) throw new Error('Referido no encontrado')

    if (decision === 'approve') {
      await tx.referral.update({
        where: { id: referralId },
        data: { flagged: false, flagReason: null },
      })
      await tx.referralReward.updateMany({
        where: { referralId, reviewRequired: true },
        data: { reviewRequired: false },
      })
      await recordReferralAudit(
        {
          actor: { userId: actor.userId ?? null, role: actor.role },
          action: 'referral.review_approved',
          clientId: referral.referrerClientId,
          referralId,
          before: { flagged: referral.flagged, status: referral.status },
          after: { flagged: false, status: 'recalculated' },
          reason: trimmed || null,
          ipAddress: actor.ipAddress ?? null,
        },
        tx
      )
      const recalculated = await recalculateReferral(referralId, tx)
      return { decision, referral: recalculated }
    }

    await tx.referral.update({
      where: { id: referralId },
      data: {
        status: REFERRAL_STATUS.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: trimmed,
        validatedAt: null,
      },
    })

    const rewards = await tx.referralReward.findMany({
      where: { referralId, status: { not: 'voided' } },
      select: { id: true },
    })
    for (const reward of rewards) {
      await voidReward(reward.id, `Referido rechazado: ${trimmed}`, actor, tx)
    }

    await recordReferralAudit(
      {
        actor: { userId: actor.userId ?? null, role: actor.role },
        action: 'referral.rejected',
        clientId: referral.referrerClientId,
        referralId,
        before: { status: referral.status, flagged: referral.flagged },
        after: { status: 'rejected' },
        reason: trimmed,
        ipAddress: actor.ipAddress ?? null,
      },
      tx
    )

    try {
      await notifyAdminChange(
        {
          clientId: referral.referrerClientId,
          referenceId: referralId,
          action: 'referral_rejected',
          reason: trimmed,
        },
        tx
      )
    } catch (error) {
      console.error('[referrals] No se pudo notificar el rechazo:', error)
    }

    return { decision, rewardsVoided: rewards.length }
  })
}

export interface AdminReferralFilters {
  query?: string
  status?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface AdminAuditRow {
  id: string
  actorUserId: string | null
  actorRole: string
  action: string
  clientId: string | null
  referralId: string | null
  rewardId: string | null
  reason: string | null
  ipAddress: string | null
  createdAt: Date
}

export interface AdminReferralPaymentRow {
  id: string | null
  role: string
  amount: number | null
  currency: string | null
  status: string | null
  paidAt: Date | null
  paymentMethod: string | null
  transactionId: string | null
  creditApplied: number
}

export interface AdminReferralRewardRow {
  id: string
  months: number
  amount: number
  currency: string
  status: string
  generatedAt: Date
  appliedAt: Date | null
  reviewRequired: boolean
}

export interface AdminReferralRow {
  id: string
  code: string
  status: string
  flagged: boolean
  flagReason: string | null
  registeredAt: Date
  validatedAt: Date | null
  referrer: {
    id: string
    name: string
    referralCode: string | null
    user: { email: string }
  }
  referred: {
    id: string
    name: string
    user: { email: string }
    plan: { name: string } | null
  }
  payments: AdminReferralPaymentRow[]
  rewards: AdminReferralRewardRow[]
}

export interface AdminReferrerRow {
  id: string
  name: string
  email: string | null
  code: string | null
  total: number
  valid: number
  pending: number
  rewards: number
}

export interface AdminRewardRow {
  id: string
  referrer: { id: string; name: string; referralCode: string | null; user: { email: string } }
  referralCode: string | null
  referredName: string | null
  months: number
  amount: number
  currency: string
  remainingAmount: number
  status: string
  reviewRequired: boolean
  generatedAt: Date
  appliedAt: Date | null
  voidedAt: Date | null
  voidReason: string | null
}

export interface AdminReviewRow {
  id: string
  code: string
  referrer: AdminReferralRow['referrer']
  referred: AdminReferralRow['referred']
  status: string
  flagReason: string | null
  registeredAt: Date
  rewards: AdminReferralRewardRow[]
}

export interface AdminReferralData {
  filters: { page: number; pageSize: number }
  kpis: {
    totalReferred: number
    pending: number
    valid: number
    monthsGenerated: number
    creditGranted: Array<{ currency: string; amount: number }>
    creditUsed: Array<{ currency: string; amount: number }>
  }
  referrals: AdminReferralRow[]
  referrers: AdminReferrerRow[]
  rewards: AdminRewardRow[]
  review: AdminReviewRow[]
  audit: AdminAuditRow[]
}

function dateFilter(from?: string, to?: string) {
  const filter: Record<string, Date> = {}
  if (from) {
    const date = new Date(from)
    if (!Number.isNaN(date.getTime())) filter.gte = date
  }
  if (to) {
    const date = new Date(to)
    if (!Number.isNaN(date.getTime())) {
      date.setHours(23, 59, 59, 999)
      filter.lte = date
    }
  }
  return Object.keys(filter).length ? filter : undefined
}

function searchWhere(query?: string) {
  const q = (query || '').trim()
  if (!q) return undefined
  return [
    { code: { contains: q } },
    { referrer: { name: { contains: q } } },
    { referrer: { user: { email: { contains: q } } } },
    { referred: { name: { contains: q } } },
    { referred: { user: { email: { contains: q } } } },
  ]
}

export async function getAdminReferralData(
  filters: AdminReferralFilters = {},
  db: any = prisma
): Promise<AdminReferralData> {
  const rawPageSize = Number(filters.pageSize ?? 200)
  const rawPage = Number(filters.page ?? 1)
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(Math.max(rawPageSize, 1), 500)
    : 200
  const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1
  const registeredAt = dateFilter(filters.from, filters.to)
  const or = searchWhere(filters.query)

  const referralWhere: any = {}
  if (or) referralWhere.OR = or
  if (registeredAt) referralWhere.registeredAt = registeredAt
  if (filters.status === 'pending') {
    referralWhere.status = { notIn: [REFERRAL_STATUS.VALID, REFERRAL_STATUS.REJECTED] }
  } else if (filters.status) {
    referralWhere.status = filters.status
  }

  const [referrals, rewards, audit, totalReferrals, validReferrals, pendingReferrals, rewardsAll, granted, used, referrersRaw] =
    await Promise.all([
      db.referral.findMany({
        where: referralWhere,
        orderBy: { registeredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          referrer: {
            select: { id: true, name: true, referralCode: true, user: { select: { email: true } } },
          },
          referred: {
            select: {
              id: true,
              name: true,
              user: { select: { email: true } },
              plan: { select: { name: true } },
            },
          },
          payments: {
            include: {
              payment: {
                select: {
                  id: true,
                  status: true,
                  amount: true,
                  currency: true,
                  paidAt: true,
                  paymentMethod: true,
                  transactionId: true,
                  creditApplied: true,
                },
              },
            },
          },
          rewards: {
            select: {
              id: true,
              months: true,
              amount: true,
              currency: true,
              status: true,
              generatedAt: true,
              appliedAt: true,
              reviewRequired: true,
            },
          },
        },
      }),
      db.referralReward.findMany({
        where: or
          ? {
              OR: [
                { referrer: { name: { contains: filters.query } } },
                { referrer: { user: { email: { contains: filters.query } } } },
                { referral: { code: { contains: filters.query } } },
              ],
            }
          : {},
        orderBy: { generatedAt: 'desc' },
        take: pageSize,
        include: {
          referrer: { select: { id: true, name: true, referralCode: true } },
          referral: {
            select: { code: true, referred: { select: { name: true } } },
          },
        },
      }),
      db.referralAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      db.referral.count(),
      db.referral.count({ where: { status: REFERRAL_STATUS.VALID } }),
      db.referral.count({
        where: { status: { notIn: [REFERRAL_STATUS.VALID, REFERRAL_STATUS.REJECTED] } },
      }),
      db.referralReward.findMany({
        where: { status: { not: 'voided' } },
        select: { months: true },
      }),
      db.referralCreditLedger.groupBy({
        by: ['currency'],
        where: { type: LEDGER_TYPE.REWARD },
        _sum: { amount: true },
      }),
      db.referralCreditLedger.groupBy({
        by: ['currency'],
        where: { type: LEDGER_TYPE.APPLICATION },
        _sum: { amount: true },
      }),
      db.client.findMany({
        where: {
          referralCode: { not: null },
          ...(filters.query
            ? {
                OR: [
                  { name: { contains: filters.query } },
                  { referralCode: { contains: filters.query } },
                  { user: { email: { contains: filters.query } } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          referralCode: true,
          user: { select: { email: true } },
          referralsGiven: {
            select: {
              status: true,
              rewards: { select: { months: true, status: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
        take: pageSize,
      }),
    ])

  return {
    filters: { page, pageSize },
    kpis: {
      totalReferred: totalReferrals,
      pending: pendingReferrals,
      valid: validReferrals,
      monthsGenerated: (rewardsAll || []).reduce(
        (sum: number, reward: any) => sum + Number(reward.months || 0),
        0
      ),
      creditGranted: (granted || []).map((row: any) => ({
        currency: row.currency,
        amount: Number(row?._sum?.amount || 0),
      })),
      creditUsed: (used || []).map((row: any) => ({
        currency: row.currency,
        amount: Math.abs(Number(row?._sum?.amount || 0)),
      })),
    },
    referrals: referrals.map((referral: any) => ({
      id: referral.id,
      code: referral.code,
      status: referral.status,
      flagged: referral.flagged,
      flagReason: referral.flagReason,
      registeredAt: referral.registeredAt,
      validatedAt: referral.validatedAt,
      referrer: referral.referrer,
      referred: referral.referred,
      payments: referral.payments.map((rp: any) => ({
        id: rp.payment?.id ?? null,
        role: rp.role,
        amount: rp.payment?.amount ?? null,
        currency: rp.payment?.currency ?? null,
        status: rp.payment?.status ?? null,
        paidAt: rp.payment?.paidAt ?? null,
        paymentMethod: rp.payment?.paymentMethod ?? null,
        transactionId: rp.payment?.transactionId ?? null,
        creditApplied: rp.payment?.creditApplied ?? 0,
      })),
      rewards: referral.rewards,
    })),
    referrers: referrersRaw.map((referrer: any) => {
      const related = referrer.referralsGiven || []
      const rewardsMonths = related.reduce(
        (sum: number, referral: any) =>
          sum +
          (referral.rewards || [])
            .filter((reward: any) => reward.status !== 'voided')
            .reduce((acc: number, reward: any) => acc + Number(reward.months || 0), 0),
        0
      )
      return {
        id: referrer.id,
        name: referrer.name,
        email: referrer.user?.email ?? null,
        code: referrer.referralCode,
        total: related.length,
        valid: related.filter((r: any) => r.status === REFERRAL_STATUS.VALID).length,
        pending: related.filter(
          (r: any) =>
            r.status !== REFERRAL_STATUS.VALID && r.status !== REFERRAL_STATUS.REJECTED
        ).length,
        rewards: rewardsMonths,
      }
    }),
    rewards: rewards.map((reward: any) => ({
      id: reward.id,
      referrer: reward.referrer,
      referralCode: reward.referral?.code ?? null,
      referredName: reward.referral?.referred?.name ?? null,
      months: reward.months,
      amount: reward.amount,
      currency: reward.currency,
      remainingAmount: reward.remainingAmount,
      status: reward.status,
      reviewRequired: reward.reviewRequired,
      generatedAt: reward.generatedAt,
      appliedAt: reward.appliedAt,
      voidedAt: reward.voidedAt,
      voidReason: reward.voidReason,
    })),
    review: referrals
      .filter(
        (referral: any) =>
          referral.flagged || referral.rewards.some((reward: any) => reward.reviewRequired)
      )
      .map((referral: any) => ({
        id: referral.id,
        code: referral.code,
        referrer: referral.referrer,
        referred: referral.referred,
        status: referral.status,
        flagReason: referral.flagReason,
        registeredAt: referral.registeredAt,
        rewards: referral.rewards,
      })),
    audit,
  }
}

export async function getAdminReferralDetail(referralId: string, db: any = prisma) {
  const referral = await db.referral.findUnique({
    where: { id: referralId },
    include: {
      referrer: { select: { id: true, name: true, referralCode: true, user: { select: { email: true } } } },
      referred: {
        select: { id: true, name: true, user: { select: { email: true } }, plan: { select: { name: true } } },
      },
      payments: {
        include: {
          payment: {
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
          },
        },
      },
      rewards: true,
    },
  })
  if (!referral) return null
  const audit = await db.referralAuditLog.findMany({
    where: { referralId },
    orderBy: { createdAt: 'desc' },
  })
  return { referral, audit }
}

export async function getAdminAudit(filters: AdminReferralFilters = {}, db: any = prisma) {
  const createdAt = dateFilter(filters.from, filters.to)
  const rawTake = Number(filters.pageSize ?? 200)
  const take = Number.isFinite(rawTake) ? Math.min(Math.max(rawTake, 1), 500) : 200
  return db.referralAuditLog.findMany({
    where: {
      ...(createdAt ? { createdAt } : {}),
      ...(filters.query
        ? {
            OR: [
              { action: { contains: filters.query } },
              { reason: { contains: filters.query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
  })
}
