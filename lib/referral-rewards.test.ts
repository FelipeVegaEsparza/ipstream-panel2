import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  computeReferralProgress,
  computeRewardValue,
  generateRewardsForReferrer,
  monthlyAmount,
  resolveMonthlyPrice,
  roundMoney,
} from './referrals/rewards'

const { applyReferralCredits } = vi.hoisted(() => ({
  applyReferralCredits: vi.fn(),
}))

vi.mock('./referrals/credit', () => ({ applyReferralCredits }))

const monthlyPlan = {
  id: 'plan-a',
  name: 'Plan A',
  price: 10000,
  currency: 'CLP',
  interval: 'monthly',
}

describe('computeReferralProgress', () => {
  it.each([
    [1, 0, 1],
    [2, 1, 0],
    [3, 1, 1],
    [4, 2, 0],
    [10, 5, 0],
  ])('con %i válidos devuelve %i recompensas y resto %i', (valid, earned, remainder) => {
    expect(computeReferralProgress(valid)).toMatchObject({
      rewardsEarned: earned,
      remainder,
    })
  })
})

describe('computeRewardValue', () => {
  it('usa la mensualidad menor cuando los planes tienen precios distintos', () => {
    const value = computeRewardValue({
      referrerPlan: monthlyPlan,
      referrerPrices: [],
      referredPlan: { ...monthlyPlan, id: 'plan-b', price: 8000 },
      referredPrices: [],
      rewardCurrency: 'CLP',
    })
    expect(value?.amount).toBe(8000)
    expect(value?.currency).toBe('CLP')
    expect((value?.snapshot as any).selectedSource).toBe('plan_base')
  })

  it('normaliza planes anuales a mensual', () => {
    const value = computeRewardValue({
      referrerPlan: { ...monthlyPlan, interval: 'yearly', price: 120000 },
      referrerPrices: [],
      referredPlan: { ...monthlyPlan, id: 'b', price: 9000 },
      referredPrices: [],
      rewardCurrency: 'CLP',
    })
    expect(value?.amount).toBe(9000)
    expect(monthlyAmount(120000, 'yearly')).toBe(10000)
  })

  it('convierte CLP/USD con la tasa configurada', () => {
    const value = computeRewardValue({
      referrerPlan: { ...monthlyPlan, currency: 'USD', price: 20 },
      referrerPrices: [],
      referredPlan: { ...monthlyPlan, id: 'b', price: 15000 },
      referredPrices: [],
      rewardCurrency: 'CLP',
      fxUsdClp: 900,
    })
    // USD 20 → CLP 18.000; el menor es CLP 15.000.
    expect(value?.amount).toBe(15000)
    expect((value?.snapshot as any).fxRate).toBe(900)
  })

  it('emite en la moneda de facturación del referente', () => {
    const resolved = resolveMonthlyPrice(
      { ...monthlyPlan, price: 10000 },
      [{ planId: 'plan-a', currency: 'USD', amount: 12 }],
      'USD',
      900
    )
    expect(resolved).toMatchObject({ amount: 12, currency: 'USD', source: 'plan_price' })
  })

  it('usa el otro plan si a uno le falta precio', () => {
    const value = computeRewardValue({
      referrerPlan: { ...monthlyPlan, price: null },
      referrerPrices: [],
      referredPlan: { ...monthlyPlan, id: 'b', price: 7000 },
      referredPrices: [],
      rewardCurrency: 'CLP',
    })
    expect(value?.amount).toBe(7000)
  })

  it('no genera valor si ningún plan tiene precio', () => {
    expect(
      computeRewardValue({
        referrerPlan: null,
        referrerPrices: [],
        referredPlan: null,
        referredPrices: [],
        rewardCurrency: 'CLP',
      })
    ).toBeNull()
  })

  it('redondea según la moneda', () => {
    expect(roundMoney(10.555, 'USD')).toBe(10.56)
    expect(roundMoney(10.555, 'CLP')).toBe(11)
  })
})

function rewardDb(options: {
  validReferrals: Array<{ id: string; referredClientId: string; validatedAt: Date }>
  existingSlots?: number[]
  createError?: any
}) {
  const referrer = {
    id: 'ref',
    billingCurrency: 'CLP',
    plan: monthlyPlan,
  }
  const referred = { id: 'new', billingCurrency: 'CLP', plan: { ...monthlyPlan, id: 'plan-b', price: 8000 } }
  const db = {
    referral: {
      findMany: vi.fn().mockResolvedValue(options.validReferrals),
    },
    referralReward: {
      findMany: vi.fn().mockResolvedValue((options.existingSlots || []).map((slotIndex) => ({ slotIndex }))),
      create: options.createError
        ? vi.fn().mockRejectedValue(options.createError)
        : vi.fn().mockImplementation(async ({ data }: any) => ({ id: `reward-${data.slotIndex}`, ...data })),
    },
    referralCreditLedger: { create: vi.fn() },
    referralAuditLog: { create: vi.fn() },
    client: {
      findUnique: vi.fn().mockImplementation(async ({ where }: any) =>
        where.id === 'ref' ? referrer : referred
      ),
    },
    planPrice: { findMany: vi.fn().mockResolvedValue([]) },
    appConfig: { findFirst: vi.fn().mockResolvedValue({ referralFxUsdClp: 900 }) },
    clientNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as any
  return db
}

const valid = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i + 1}`,
    referredClientId: `new-${i + 1}`,
    validatedAt: new Date(2026, 0, i + 1),
  }))

beforeEach(() => {
  applyReferralCredits.mockReset()
  applyReferralCredits.mockResolvedValue({ applied: 0, cyclesSettled: 0 })
})

describe('generateRewardsForReferrer', () => {
  it('con dos válidos genera exactamente una recompensa', async () => {
    const db = rewardDb({ validReferrals: valid(2) })
    const result = await generateRewardsForReferrer('ref', db)
    expect(result.created).toBe(1)
    expect(db.referralReward.create).toHaveBeenCalledTimes(1)
    expect(db.referralReward.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referrerClientId: 'ref',
        slotIndex: 0,
        months: 1,
        amount: 8000,
        currency: 'CLP',
      }),
    })
    expect(db.referralCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'reward', amount: 8000 }),
    })
  })

  it('con tres válidos mantiene una recompensa', async () => {
    const db = rewardDb({ validReferrals: valid(3) })
    await expect(generateRewardsForReferrer('ref', db)).resolves.toEqual({ created: 1 })
  })

  it('con cuatro válidos genera dos recompensas', async () => {
    const db = rewardDb({ validReferrals: valid(4) })
    await expect(generateRewardsForReferrer('ref', db)).resolves.toEqual({ created: 2 })
    expect(db.referralReward.create).toHaveBeenCalledTimes(2)
  })

  it('no duplica un slot ya generado', async () => {
    const db = rewardDb({ validReferrals: valid(4), existingSlots: [0] })
    await expect(generateRewardsForReferrer('ref', db)).resolves.toEqual({ created: 1 })
    expect(db.referralReward.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slotIndex: 1 }),
    })
  })

  it('resuelve una carrera de índice único sin romper el proceso', async () => {
    const db = rewardDb({ validReferrals: valid(2), createError: { code: 'P2002' } })
    await expect(generateRewardsForReferrer('ref', db)).resolves.toEqual({ created: 0 })
  })

  it('no genera recompensas con un solo válido', async () => {
    const db = rewardDb({ validReferrals: valid(1) })
    await expect(generateRewardsForReferrer('ref', db)).resolves.toEqual({ created: 0 })
  })
})
