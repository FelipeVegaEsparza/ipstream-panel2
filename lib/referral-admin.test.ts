import { describe, expect, it, vi } from 'vitest'
import {
  getAdminReferralData,
  resolveReferralReview,
  voidReward,
} from './referrals/admin'
import { recordReferralAudit } from './referrals/audit'

function auditDb() {
  return { referralAuditLog: { create: vi.fn().mockResolvedValue({ id: 'a1' }) } } as any
}

describe('recordReferralAudit', () => {
  it('registra actor, entidad, valores y motivo', async () => {
    const db = auditDb()
    await recordReferralAudit(
      {
        actor: { userId: 'admin-1', role: 'ADMIN' },
        action: 'reward.voided',
        clientId: 'c1',
        rewardId: 'w1',
        before: { status: 'available' },
        after: { status: 'voided' },
        reason: 'Fraude',
        ipAddress: '1.2.3.4',
      },
      db
    )
    expect(db.referralAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'admin-1',
        actorRole: 'ADMIN',
        action: 'reward.voided',
        clientId: 'c1',
        referralId: null,
        rewardId: 'w1',
        before: { status: 'available' },
        after: { status: 'voided' },
        reason: 'Fraude',
        ipAddress: '1.2.3.4',
      },
    })
  })
})

function rewardDb(reward: Record<string, unknown>) {
  return {
    referralReward: {
      findUnique: vi.fn().mockResolvedValue(reward),
      update: vi.fn().mockImplementation(async ({ data }: any) => ({ ...reward, ...data })),
    },
    referralCreditLedger: { create: vi.fn().mockResolvedValue({}) },
    referralAuditLog: { create: vi.fn().mockResolvedValue({}) },
    clientNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as any
}

const baseReward = {
  id: 'w1',
  referrerClientId: 'c1',
  referralId: 'r1',
  amount: 10000,
  remainingAmount: 10000,
  currency: 'CLP',
  status: 'available',
}

describe('voidReward', () => {
  it('anula una recompensa disponible con un asiento void', async () => {
    const db = rewardDb(baseReward)
    const result = await voidReward('w1', 'Duplicada', {
      userId: 'admin',
      role: 'ADMIN',
    }, db)
    expect(result).toMatchObject({ alreadyVoided: false })
    expect(db.referralCreditLedger.create).toHaveBeenCalledTimes(1)
    expect(db.referralCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'void', amount: -10000 }),
    })
    expect(db.referralReward.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: expect.objectContaining({ status: 'voided', remainingAmount: 0 }),
    })
    expect(db.referralAuditLog.create).toHaveBeenCalled()
    expect(db.clientNotification.createMany).toHaveBeenCalled()
  })

  it('genera deuda si la recompensa ya fue consumida', async () => {
    const db = rewardDb({ ...baseReward, status: 'applied', remainingAmount: 0 })
    const result = await voidReward('w1', 'Contracargo', { role: 'ADMIN' }, db)
    expect(result).toMatchObject({ consumed: 10000 })
    expect(db.referralCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'debt', amount: -10000 }),
    })
  })

  it('exige motivo', async () => {
    const db = rewardDb(baseReward)
    await expect(voidReward('w1', '   ', { role: 'ADMIN' }, db)).rejects.toThrow(
      'obligatorio'
    )
    expect(db.referralCreditLedger.create).not.toHaveBeenCalled()
  })
})

describe('resolveReferralReview', () => {
  it('rechaza un referido con motivo y audita', async () => {
    const db = {
      referral: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r1',
          status: 'valid',
          flagged: true,
          flagReason: 'payment_refunded',
          referrerClientId: 'c1',
          referredClientId: 'c2',
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      referralReward: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      referralAuditLog: { create: vi.fn().mockResolvedValue({}) },
      clientNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as any

    const result = await resolveReferralReview('r1', 'reject', 'Pago reembolsado', {
      userId: 'admin',
      role: 'ADMIN',
    }, db)

    expect(result).toMatchObject({ decision: 'reject', rewardsVoided: 0 })
    expect(db.referral.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({ status: 'rejected', rejectionReason: 'Pago reembolsado' }),
    })
    expect(db.referralAuditLog.create).toHaveBeenCalled()
  })

  it('exige motivo para rechazar', async () => {
    await expect(
      resolveReferralReview('r1', 'reject', '', { role: 'ADMIN' }, {} as any)
    ).rejects.toThrow('obligatorio')
  })
})

describe('getAdminReferralData', () => {
  function adminDb() {
    const referrals = [
      {
        id: 'r1',
        code: 'CAST-A',
        status: 'valid',
        flagged: false,
        flagReason: null,
        registeredAt: new Date('2026-01-02'),
        validatedAt: new Date('2026-03-02'),
        referrer: { id: 'c1', name: 'Radio Dueña', referralCode: 'CAST-A', user: { email: 'duena@test.com' } },
        referred: { id: 'c2', name: 'Radio Nueva', user: { email: 'nueva@test.com' }, plan: { name: 'Plan Básico' } },
        payments: [
          {
            role: 'first',
            payment: {
              id: 'p1',
              status: 'completed',
              amount: 10000,
              currency: 'CLP',
              paidAt: new Date('2026-01-02'),
              paymentMethod: 'bank_transfer',
              transactionId: 'TX-1',
              creditApplied: 0,
            },
          },
        ],
        rewards: [
          { id: 'w1', months: 1, amount: 8000, currency: 'CLP', status: 'available', generatedAt: new Date('2026-03-02'), appliedAt: null, reviewRequired: false },
        ],
      },
    ]
    return {
      referral: {
        findMany: vi.fn().mockResolvedValue(referrals),
        count: vi.fn().mockImplementation(async (args?: any) => {
          const where = args?.where
          if (!where) return 1
          if (where.status === 'valid') return 1
          return 0
        }),
      },
      referralReward: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'w1',
            referrer: { id: 'c1', name: 'Radio Dueña', referralCode: 'CAST-A', user: { email: 'duena@test.com' } },
            referral: { code: 'CAST-A', referred: { name: 'Radio Nueva' } },
            months: 1,
            amount: 8000,
            currency: 'CLP',
            remainingAmount: 8000,
            status: 'available',
            reviewRequired: false,
            generatedAt: new Date('2026-03-02'),
            appliedAt: null,
            voidedAt: null,
            voidReason: null,
          },
        ]),
      },
      referralAuditLog: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'a1', actorRole: 'ADMIN', action: 'reward.voided', reason: 'Fraude', createdAt: new Date() },
        ]),
      },
      referralCreditLedger: {
        groupBy: vi.fn().mockImplementation(async ({ where }: any) =>
          where.type === 'reward'
            ? [{ currency: 'CLP', _sum: { amount: 16000 } }]
            : [{ currency: 'CLP', _sum: { amount: -8000 } }]
        ),
      },
      client: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'c1',
            name: 'Radio Dueña',
            referralCode: 'CAST-A',
            user: { email: 'duena@test.com' },
            referralsGiven: [
              { status: 'valid', rewards: [{ months: 1, status: 'available' }] },
            ],
          },
        ]),
      },
    } as any
  }

  it('devuelve KPIs, referentes, referidos, recompensas y auditoría', async () => {
    const data = await getAdminReferralData({ query: 'Radio' }, adminDb())
    expect(data.kpis).toMatchObject({
      totalReferred: 1,
      valid: 1,
      pending: 0,
      monthsGenerated: 1,
    })
    expect(data.kpis.creditGranted).toEqual([{ currency: 'CLP', amount: 16000 }])
    expect(data.kpis.creditUsed).toEqual([{ currency: 'CLP', amount: 8000 }])
    expect(data.referrers[0]).toMatchObject({
      name: 'Radio Dueña',
      total: 1,
      valid: 1,
      rewards: 1,
    })
    expect(data.referrals[0].payments[0]).toMatchObject({ role: 'first', id: 'p1' })
    expect(data.rewards[0]).toMatchObject({ id: 'w1', referredName: 'Radio Nueva' })
    expect(data.audit[0]).toMatchObject({ action: 'reward.voided' })
  })

  it('usa un estado vacío cuando no hay datos', async () => {
    const db = adminDb()
    db.referral.findMany.mockResolvedValue([])
    db.referralReward.findMany.mockResolvedValue([])
    db.referralAuditLog.findMany.mockResolvedValue([])
    db.client.findMany.mockResolvedValue([])
    db.referral.count.mockResolvedValue(0)
    const data = await getAdminReferralData({}, db)
    expect(data.referrals).toEqual([])
    expect(data.referrers).toEqual([])
    expect(data.rewards).toEqual([])
    expect(data.review).toEqual([])
  })
})
