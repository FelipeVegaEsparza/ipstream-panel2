import { beforeEach, describe, expect, it, vi } from 'vitest'
import { selectValidationPayments } from './referrals/payment-rules'
import { recalculateReferral } from './referrals/validation'
import { computeReferralProgress } from './referrals/rewards'

const { generateRewardsForReferrer } = vi.hoisted(() => ({
  generateRewardsForReferrer: vi.fn(),
}))

vi.mock('./referrals/rewards', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return { ...actual, generateRewardsForReferrer }
})

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    status: 'completed',
    amount: 10000,
    currency: 'CLP',
    paidAt: new Date('2026-01-15'),
    paymentMethod: 'bank_transfer',
    transactionId: 'TX-1',
    creditApplied: 0,
    dueDate: new Date('2026-01-01'),
    ...overrides,
  }
}

function buildReferral(overrides: Record<string, unknown> = {}) {
  const payments = (overrides.referred as any)?.payments ?? [payment()]
  return {
    id: 'r1',
    referrerClientId: 'ref',
    referredClientId: 'new',
    status: 'registered',
    flagged: false,
    firstPaidAt: null,
    secondPaidAt: null,
    validatedAt: null,
    referred: {
      id: 'new',
      name: 'Radio Nueva',
      subscription: {
        startDate: new Date('2026-01-01'),
        plan: { id: 'plan', name: 'Plan', interval: 'monthly' },
      },
      payments,
      ...(overrides.referred as any),
    },
    ...overrides,
  }
}

function fakeDb(referral: any) {
  return {
    referral: {
      findUnique: vi.fn().mockResolvedValue(referral),
      update: vi.fn().mockResolvedValue(referral),
    },
    referralPayment: { upsert: vi.fn().mockResolvedValue({}) },
    clientNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    payment: { findUnique: vi.fn() },
  } as any
}

beforeEach(() => {
  generateRewardsForReferrer.mockReset()
  generateRewardsForReferrer.mockResolvedValue({ created: 1 })
})

describe('selectValidationPayments', () => {
  const start = new Date('2026-01-01')
  const opts = { startDate: start, interval: 'monthly' }

  it('sin pagos no confirma nada', () => {
    const result = selectValidationPayments([], opts)
    expect(result.firstConfirmed).toBe(false)
    expect(result.secondConfirmed).toBe(false)
  })

  it('con un pago solo confirma el primero', () => {
    const result = selectValidationPayments([payment()], opts)
    expect(result.firstConfirmed).toBe(true)
    expect(result.secondConfirmed).toBe(false)
  })

  it('con dos pagos consecutivos confirma ambos', () => {
    const result = selectValidationPayments(
      [payment(), payment({ id: 'p2', dueDate: new Date('2026-02-01'), transactionId: 'TX-2' })],
      opts
    )
    expect(result.firstConfirmed).toBe(true)
    expect(result.secondConfirmed).toBe(true)
  })

  it('un ciclo faltante rompe la secuencia', () => {
    const result = selectValidationPayments(
      [payment(), payment({ id: 'p3', dueDate: new Date('2026-03-01'), transactionId: 'TX-3' })],
      opts
    )
    expect(result.firstConfirmed).toBe(true)
    expect(result.secondConfirmed).toBe(false)
  })

  it('excluye pagos cubiertos por crédito, de prueba y no confirmados', () => {
    const result = selectValidationPayments(
      [
        payment({ paymentMethod: 'referral_credit' }),
        payment({ id: 'p2', dueDate: new Date('2026-02-01'), creditApplied: 500 }),
      ],
      opts
    )
    expect(result.firstConfirmed).toBe(false)
    expect(result.secondConfirmed).toBe(false)
    expect(
      selectValidationPayments([payment({ transactionId: 'TEST_1' })], opts).firstConfirmed
    ).toBe(false)
  })

  it('no cuenta dos veces la misma transacción duplicada', () => {
    const result = selectValidationPayments(
      [payment(), payment({ id: 'dup' })],
      opts
    )
    expect(result.first).toBeTruthy()
    expect(result.secondConfirmed).toBe(false)
  })

  it('soporta planes anuales con dos ciclos anuales', () => {
    const yearly = { startDate: new Date('2026-01-01'), interval: 'yearly' }
    const result = selectValidationPayments(
      [
        payment(),
        payment({ id: 'p2', dueDate: new Date('2027-01-01'), transactionId: 'TX-2' }),
      ],
      yearly
    )
    expect(result.secondConfirmed).toBe(true)
  })
})

describe('recalculateReferral', () => {
  it('pasa a pending_contract si no hay suscripción', async () => {
    const referral = buildReferral({
      referred: { id: 'new', name: 'Radio Nueva', subscription: null, payments: [] },
    })
    const db = fakeDb(referral)
    await expect(recalculateReferral('r1', db)).resolves.toMatchObject({
      status: 'pending_contract',
    })
    expect(db.referral.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'pending_contract' },
    })
  })

  it('queda pendiente del primer pago sin pagos válidos', async () => {
    const referral = buildReferral({
      referred: { id: 'new', name: 'Radio Nueva', subscription: { startDate: new Date('2026-01-01'), plan: { interval: 'monthly' } }, payments: [] },
    })
    const db = fakeDb(referral)
    await expect(recalculateReferral('r1', db)).resolves.toMatchObject({
      status: 'pending_first_payment',
      firstConfirmed: false,
    })
  })

  it('marca primer pago confirmado y notifica', async () => {
    const referral = buildReferral()
    const db = fakeDb(referral)
    const result = await recalculateReferral('r1', db)
    expect(result).toMatchObject({ status: 'first_payment_confirmed', firstConfirmed: true })
    expect(db.referralPayment.upsert).toHaveBeenCalledTimes(1)
    expect(db.clientNotification.createMany).toHaveBeenCalled()
  })

  it('pasa a pendiente de segundo pago cuando existe el siguiente ciclo', async () => {
    const referral = buildReferral({
      referred: {
        id: 'new',
        name: 'Radio Nueva',
        subscription: { startDate: new Date('2026-01-01'), plan: { interval: 'monthly' } },
        payments: [payment(), payment({ id: 'p2', status: 'pending', paidAt: null, dueDate: new Date('2026-02-01') })],
      },
    })
    const db = fakeDb(referral)
    const result = await recalculateReferral('r1', db)
    expect(result).toMatchObject({ status: 'pending_second_payment' })
  })

  it('valida el referido con dos pagos y genera recompensa', async () => {
    const referral = buildReferral({
      referred: {
        id: 'new',
        name: 'Radio Nueva',
        subscription: { startDate: new Date('2026-01-01'), plan: { interval: 'monthly' } },
        payments: [
          payment(),
          payment({ id: 'p2', dueDate: new Date('2026-02-01'), transactionId: 'TX-2' }),
        ],
      },
    })
    const db = fakeDb(referral)
    const result = await recalculateReferral('r1', db)
    expect(result).toMatchObject({ status: 'valid', becameValid: true, secondConfirmed: true })
    expect(db.referral.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({ status: 'valid' }),
    })
    expect(generateRewardsForReferrer).toHaveBeenCalledWith('ref', db, 'r1')
  })

  it('no valida un referido marcado aunque tenga dos pagos', async () => {
    const referral = buildReferral({
      flagged: true,
      referred: {
        id: 'new',
        name: 'Radio Nueva',
        subscription: { startDate: new Date('2026-01-01'), plan: { interval: 'monthly' } },
        payments: [
          payment(),
          payment({ id: 'p2', dueDate: new Date('2026-02-01'), transactionId: 'TX-2' }),
        ],
      },
    })
    const db = fakeDb(referral)
    const result = await recalculateReferral('r1', db)
    expect(result).toMatchObject({ status: 'pending_second_payment', becameValid: false })
    expect(generateRewardsForReferrer).not.toHaveBeenCalled()
  })

  it('no cambia un referido rechazado', async () => {
    const referral = buildReferral({ status: 'rejected' })
    const db = fakeDb(referral)
    await expect(recalculateReferral('r1', db)).resolves.toMatchObject({
      status: 'rejected',
      becameValid: false,
    })
    expect(db.referral.update).not.toHaveBeenCalled()
  })

  it('es idempotente: no vuelve a generar recompensa si sigue válido', async () => {
    const referral = buildReferral({
      status: 'valid',
      validatedAt: new Date('2026-02-15'),
      firstPaidAt: new Date('2026-01-15'),
      secondPaidAt: new Date('2026-02-15'),
      referred: {
        id: 'new',
        name: 'Radio Nueva',
        subscription: { startDate: new Date('2026-01-01'), plan: { interval: 'monthly' } },
        payments: [
          payment(),
          payment({ id: 'p2', dueDate: new Date('2026-02-01'), transactionId: 'TX-2' }),
        ],
      },
    })
    const db = fakeDb(referral)
    const result = await recalculateReferral('r1', db)
    expect(result).toMatchObject({ status: 'valid', becameValid: false })
    expect(generateRewardsForReferrer).not.toHaveBeenCalled()
  })
})

describe('computeReferralProgress', () => {
  it('calcula 1/2, 3/4 y 10 válidos', () => {
    expect(computeReferralProgress(1)).toMatchObject({ rewardsEarned: 0, remainder: 1 })
    expect(computeReferralProgress(2)).toMatchObject({ rewardsEarned: 1, remainder: 0 })
    expect(computeReferralProgress(3)).toMatchObject({ rewardsEarned: 1, remainder: 1 })
    expect(computeReferralProgress(4)).toMatchObject({ rewardsEarned: 2, remainder: 0 })
    expect(computeReferralProgress(10)).toMatchObject({ rewardsEarned: 5, remainder: 0 })
  })
})
