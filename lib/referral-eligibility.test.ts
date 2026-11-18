import { describe, expect, it, vi } from 'vitest'
import {
  evaluateReferrerEligibility,
  getReferrerEligibility,
  isReferrerEligible,
} from './referrals/eligibility'
import { isValidationPayment } from './referrals/payment-rules'

const activePayment = {
  status: 'completed',
  amount: 10000,
  paidAt: new Date('2026-01-01'),
  paymentMethod: 'bank_transfer',
  transactionId: 'TX-1',
  creditApplied: 0,
  dueDate: new Date('2026-01-01'),
}

describe('isValidationPayment', () => {
  it('acepta un pago real confirmado', () => {
    expect(isValidationPayment(activePayment)).toBe(true)
  })

  it('rechaza pendientes, fallidos, sin fecha e importe cero', () => {
    expect(isValidationPayment({ ...activePayment, status: 'pending' })).toBe(false)
    expect(isValidationPayment({ ...activePayment, status: 'failed' })).toBe(false)
    expect(isValidationPayment({ ...activePayment, paidAt: null })).toBe(false)
    expect(isValidationPayment({ ...activePayment, amount: 0 })).toBe(false)
  })

  it('rechaza pagos de prueba y cubiertos por crédito', () => {
    expect(isValidationPayment({ ...activePayment, paymentMethod: 'test' })).toBe(false)
    expect(isValidationPayment({ ...activePayment, paymentMethod: 'sandbox' })).toBe(false)
    expect(isValidationPayment({ ...activePayment, transactionId: 'TEST_123' })).toBe(false)
    expect(isValidationPayment({ ...activePayment, paymentMethod: 'referral_credit' })).toBe(false)
    expect(isValidationPayment({ ...activePayment, creditApplied: 10 })).toBe(false)
  })
})

describe('evaluateReferrerEligibility', () => {
  it('exige cuenta activa, suscripción activa y un pago confirmado', () => {
    expect(
      evaluateReferrerEligibility({
        isActive: true,
        subscription: { status: 'active' },
        payments: [activePayment],
      })
    ).toEqual({ eligible: true, reason: 'eligible' })
  })

  it('rechaza cuentas inactivas', () => {
    expect(
      evaluateReferrerEligibility({
        isActive: false,
        subscription: { status: 'active' },
        payments: [activePayment],
      })
    ).toEqual({ eligible: false, reason: 'inactive_account' })
  })

  it('rechaza clientes sin suscripción', () => {
    expect(
      evaluateReferrerEligibility({ isActive: true, subscription: null, payments: [activePayment] })
    ).toEqual({ eligible: false, reason: 'no_subscription' })
  })

  it('rechaza suscripciones no activas', () => {
    expect(
      evaluateReferrerEligibility({
        isActive: true,
        subscription: { status: 'trialing' },
        payments: [activePayment],
      })
    ).toEqual({ eligible: false, reason: 'inactive_subscription' })
  })

  it('rechaza clientes sin mensualidad pagada', () => {
    expect(
      evaluateReferrerEligibility({
        isActive: true,
        subscription: { status: 'active' },
        payments: [{ ...activePayment, status: 'pending' }],
      })
    ).toEqual({ eligible: false, reason: 'no_paid_month' })
  })
})

describe('consultas de elegibilidad', () => {
  it('consulta al cliente con sus pagos y devuelve el resultado', async () => {
    const db = {
      client: {
        findUnique: vi.fn().mockResolvedValue({
          user: { isActive: true },
          subscription: { status: 'active' },
          payments: [activePayment],
        }),
      },
    } as any

    await expect(isReferrerEligible('c1', db)).resolves.toBe(true)
    expect(db.client.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } })
    )
  })

  it('devuelve no elegible si el cliente no existe', async () => {
    const db = { client: { findUnique: vi.fn().mockResolvedValue(null) } } as any
    await expect(getReferrerEligibility('missing', db)).resolves.toEqual({
      eligible: false,
      reason: 'inactive_account',
    })
  })
})
