import { describe, expect, it, vi } from 'vitest'
import { applyReferralCredits, getCreditBalance, getCreditBalances } from './referrals/credit'

function reward(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reward-1',
    referrerClientId: 'client',
    status: 'available',
    amount: 10000,
    remainingAmount: 10000,
    currency: 'CLP',
    generatedAt: new Date('2026-01-15'),
    ...overrides,
  }
}

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    clientId: 'client',
    subscriptionId: 'sub-1',
    status: 'pending',
    amount: 10000,
    currency: 'CLP',
    creditApplied: 0,
    dueDate: new Date('2026-02-01'),
    ...overrides,
  }
}

function creditDb(options: {
  rewards: any[]
  payments: any[]
  balances?: Record<string, number>
}) {
  const balances = options.balances || { CLP: 10000 }
  let nextCount = 0
  const db = {
    referralReward: {
      findMany: vi.fn().mockResolvedValue(options.rewards),
      update: vi.fn().mockResolvedValue({}),
    },
    referralCreditLedger: {
      aggregate: vi.fn().mockImplementation(async ({ where }: any) => ({
        _sum: { amount: balances[where.currency] ?? 0 },
      })),
      groupBy: vi.fn().mockResolvedValue(
        Object.entries(balances).map(([currency, amount]) => ({
          currency,
          _sum: { amount },
        }))
      ),
      create: vi.fn().mockResolvedValue({}),
    },
    payment: {
      findMany: vi.fn().mockResolvedValue(options.payments),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockImplementation(async ({ data }: any) => {
        nextCount++
        return { id: `next-${nextCount}`, creditApplied: 0, ...data }
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'sub-1',
        plan: { interval: 'monthly' },
        status: 'active',
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    appConfig: { findFirst: vi.fn().mockResolvedValue({ referralFxUsdClp: 900 }) },
    clientNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as any
  return db
}

describe('getCreditBalance', () => {
  it('suma los asientos del ledger por cliente y moneda', async () => {
    const db = {
      referralCreditLedger: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 2500 } }),
      },
    } as any
    await expect(getCreditBalance('c1', 'CLP', db)).resolves.toBe(2500)
    expect(db.referralCreditLedger.aggregate).toHaveBeenCalledWith({
      where: { clientId: 'c1', currency: 'CLP' },
      _sum: { amount: true },
    })
  })

  it('devuelve saldos agrupados y descarta los vacíos', async () => {
    const db = {
      referralCreditLedger: {
        groupBy: vi.fn().mockResolvedValue([
          { currency: 'CLP', _sum: { amount: 1000 } },
          { currency: 'USD', _sum: { amount: 0 } },
        ]),
      },
    } as any
    await expect(getCreditBalances('c1', db)).resolves.toEqual([{ currency: 'CLP', amount: 1000 }])
  })
})

describe('applyReferralCredits', () => {
  it('cubre por completo un pago y avanza la suscripción', async () => {
    const db = creditDb({ rewards: [reward()], payments: [payment()] })
    const result = await applyReferralCredits('client', db)

    expect(result).toEqual({ applied: 10000, cyclesSettled: 1 })
    expect(db.referralCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rewardId: 'reward-1',
        paymentId: 'pay-1',
        type: 'application',
        amount: -10000,
        currency: 'CLP',
      }),
    })
    expect(db.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { creditApplied: 10000, creditCurrency: 'CLP' },
    })
    expect(db.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: expect.objectContaining({
        status: 'completed',
        paymentMethod: 'referral_credit',
      }),
    })
    expect(db.payment.create).toHaveBeenCalledTimes(1)
    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({ status: 'active' }),
    })
    expect(db.referralReward.update).toHaveBeenCalledWith({
      where: { id: 'reward-1' },
      data: expect.objectContaining({ status: 'applied' }),
    })
  })

  it('aplica cobertura parcial y deja el saldo pendiente', async () => {
    const db = creditDb({
      rewards: [reward({ remainingAmount: 5000 })],
      payments: [payment()],
      balances: { CLP: 5000 },
    })
    const result = await applyReferralCredits('client', db)
    expect(result).toEqual({ applied: 5000, cyclesSettled: 0 })
    expect(db.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-1' },
      data: { creditApplied: 5000, creditCurrency: 'CLP' },
    })
    expect(db.payment.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) })
    )
  })

  it('aplica varios meses acumulados en ciclos consecutivos', async () => {
    const db = creditDb({
      rewards: [
        reward({ id: 'reward-1', generatedAt: new Date('2026-01-15') }),
        reward({ id: 'reward-2', generatedAt: new Date('2026-01-16') }),
      ],
      payments: [payment()],
      balances: { CLP: 20000 },
    })
    const result = await applyReferralCredits('client', db)
    expect(result).toEqual({ applied: 20000, cyclesSettled: 2 })
    expect(db.referralCreditLedger.create).toHaveBeenCalledTimes(2)
    expect(db.payment.create).toHaveBeenCalledTimes(2)
  })

  it('no aplica crédito si el saldo neto es cero por una deuda', async () => {
    const db = creditDb({
      rewards: [reward()],
      payments: [payment()],
      balances: { CLP: 0 },
    })
    const result = await applyReferralCredits('client', db)
    expect(result).toEqual({ applied: 0, cyclesSettled: 0 })
    expect(db.referralCreditLedger.create).not.toHaveBeenCalled()
  })

  it('no aplica sobre pagos ya confirmados ni anteriores a la recompensa', async () => {
    const db = creditDb({
      rewards: [reward({ generatedAt: new Date('2026-03-01') })],
      payments: [
        payment({ id: 'old', dueDate: new Date('2026-02-01') }),
        payment({ id: 'paid', status: 'completed', dueDate: new Date('2026-04-01') }),
      ],
      balances: { CLP: 10000 },
    })
    const result = await applyReferralCredits('client', db)
    expect(result).toEqual({ applied: 0, cyclesSettled: 0 })
    expect(db.payment.update).not.toHaveBeenCalled()
  })

  it('no hace nada si el cliente no tiene recompensas', async () => {
    const db = creditDb({ rewards: [], payments: [payment()] })
    await expect(applyReferralCredits('client', db)).resolves.toEqual({
      applied: 0,
      cyclesSettled: 0,
    })
    expect(db.payment.findMany).not.toHaveBeenCalled()
  })

  it('convierte una recompensa en USD a un pago en CLP', async () => {
    const db = creditDb({
      rewards: [reward({ currency: 'USD', amount: 10, remainingAmount: 10 })],
      payments: [payment({ amount: 5000 })],
      balances: { USD: 10 },
    })
    const result = await applyReferralCredits('client', db)
    expect(result.cyclesSettled).toBe(1)
    expect(db.referralCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -5.56,
        currency: 'USD',
        fxRate: 900,
      }),
    })
  })
})
