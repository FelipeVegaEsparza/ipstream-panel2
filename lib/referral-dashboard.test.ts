import { describe, expect, it, vi } from 'vitest'
import { getReferralDashboard } from './referrals/dashboard'
import { paymentNetAmount } from './billing-format'

const activePayment = {
  id: 'p1',
  status: 'completed',
  amount: 10000,
  paidAt: new Date('2026-01-01'),
  paymentMethod: 'bank_transfer',
  transactionId: 'TX-1',
  creditApplied: 0,
  dueDate: new Date('2026-01-01'),
}

function eligibleDb() {
  const referrals = [
    {
      id: 'r1',
      status: 'valid',
      registeredAt: new Date('2026-01-02'),
      validatedAt: new Date('2026-03-02'),
      flagged: false,
      flagReason: null,
      referred: { name: 'Radio Uno', plan: { name: 'Plan Básico' } },
      payments: [{ role: 'first' }, { role: 'second' }],
    },
    {
      id: 'r2',
      status: 'valid',
      registeredAt: new Date('2026-01-03'),
      validatedAt: new Date('2026-03-03'),
      flagged: false,
      flagReason: null,
      referred: { name: 'Radio Dos', plan: { name: 'Plan Pro' } },
      payments: [{ role: 'first' }, { role: 'second' }],
    },
    {
      id: 'r3',
      status: 'pending_second_payment',
      registeredAt: new Date('2026-01-04'),
      validatedAt: null,
      flagged: true,
      flagReason: 'same_ip',
      referred: { name: 'Radio Tres', plan: { name: 'Plan Básico' } },
      payments: [{ role: 'first' }],
    },
    {
      id: 'r4',
      status: 'rejected',
      registeredAt: new Date('2026-01-05'),
      validatedAt: null,
      flagged: true,
      flagReason: 'payment_refunded',
      referred: { name: 'Radio Cuatro', plan: { name: 'Plan Básico' } },
      payments: [],
    },
  ]
  const rewards = [
    { id: 'w1', generatedAt: new Date('2026-03-02'), months: 1, amount: 8000, currency: 'CLP', status: 'available', remainingAmount: 8000, appliedAt: null },
    { id: 'w2', generatedAt: new Date('2026-03-03'), months: 1, amount: 8000, currency: 'CLP', status: 'available', remainingAmount: 8000, appliedAt: null },
    { id: 'w3', generatedAt: new Date('2026-02-02'), months: 1, amount: 8000, currency: 'CLP', status: 'applied', remainingAmount: 0, appliedAt: new Date('2026-02-10') },
    { id: 'w4', generatedAt: new Date('2026-01-02'), months: 1, amount: 8000, currency: 'CLP', status: 'voided', remainingAmount: 0, appliedAt: null },
  ]

  const db = {
    client: {
      findUnique: vi.fn().mockImplementation(async ({ select }: any) => {
        if (select?.user) {
          return {
            user: { isActive: true },
            subscription: { status: 'active' },
            payments: [activePayment],
          }
        }
        return { id: 'client-1', name: 'Radio Dueña', referralCode: 'CAST-RADIOABC' }
      }),
    },
    appConfig: { findFirst: vi.fn().mockResolvedValue({ clientSitesDomain: 'casterfly.com' }) },
    referral: { findMany: vi.fn().mockResolvedValue(referrals) },
    referralReward: { findMany: vi.fn().mockResolvedValue(rewards) },
    referralCreditLedger: {
      groupBy: vi.fn().mockResolvedValue([{ currency: 'CLP', _sum: { amount: 16000 } }]),
    },
  } as any
  return db
}

describe('getReferralDashboard', () => {
  it('entrega resumen, enlace e historiales del cliente elegible', async () => {
    const data = await getReferralDashboard('client-1', eligibleDb())

    expect(data.eligible).toBe(true)
    expect(data.code).toBe('CAST-RADIOABC')
    expect(data.link).toMatch(/^https?:\/\/[^/]+\/planes\?ref=CAST-RADIOABC$/)
    expect(data.summary).toEqual({
      totalReferred: 4,
      valid: 2,
      pending: 1,
      rejected: 1,
      monthsAccumulated: 3,
      monthsAvailable: 2,
      monthsUsed: 1,
    })
    expect(data.progress).toMatchObject({ validCount: 2, remainder: 0, remainingToNext: 2 })
    expect(data.referrals).toHaveLength(4)
    expect(data.referrals[0]).toMatchObject({
      referredName: 'Radio Uno',
      statusLabel: 'Referido válido',
      paymentProgress: 2,
    })
    expect(data.rewards).toHaveLength(4)
  })

  it('no expone datos financieros de los referidos', async () => {
    const data = await getReferralDashboard('client-1', eligibleDb())
    const serialized = JSON.stringify(data.referrals)
    expect(serialized).not.toContain('paymentMethod')
    expect(serialized).not.toContain('transactionId')
    expect(serialized).not.toContain('email')
    expect(serialized).not.toContain('amount')
    expect(serialized).not.toContain('currency')
  })

  it('un cliente no elegible no recibe código ni enlace', async () => {
    const db = {
      client: {
        findUnique: vi.fn().mockResolvedValue({
          user: { isActive: true },
          subscription: null,
          payments: [],
        }),
      },
      referral: { findMany: vi.fn().mockResolvedValue([]) },
      referralReward: { findMany: vi.fn().mockResolvedValue([]) },
      referralCreditLedger: { groupBy: vi.fn().mockResolvedValue([]) },
    } as any

    const data = await getReferralDashboard('client-1', db)
    expect(data.eligible).toBe(false)
    expect(data.code).toBeNull()
    expect(data.link).toBeNull()
    expect(data.eligibilityMessage).toContain('plan')
    expect(data.summary.totalReferred).toBe(0)
  })
})

describe('paymentNetAmount', () => {
  it('descuenta el crédito sin bajar de cero', () => {
    expect(paymentNetAmount(10000, 2500)).toBe(7500)
    expect(paymentNetAmount(10000, 10000)).toBe(0)
    expect(paymentNetAmount(10000, 15000)).toBe(0)
    expect(paymentNetAmount(10000, null)).toBe(10000)
  })
})
