import { describe, expect, it, vi } from 'vitest'
import { handlePaymentReversed } from './referrals/reversal'

function reversalDb(options: {
  referralPayment?: any
  applications?: any[]
  reward?: any
}) {
  const db = {
    payment: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'p1',
        clientId: 'c2',
        amount: 10000,
        currency: 'CLP',
        creditApplied: 0,
        subscriptionId: 'sub-1',
        status: 'refunded',
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    referralPayment: {
      findUnique: vi.fn().mockResolvedValue(options.referralPayment ?? null),
    },
    referral: {
      update: vi.fn().mockResolvedValue({}),
    },
    referralReward: {
      findMany: vi.fn().mockResolvedValue(
        options.referralPayment
          ? [{ id: 'w1', status: 'available', reviewRequired: false }]
          : []
      ),
      findUnique: vi.fn().mockResolvedValue(options.reward ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
    referralAuditLog: { create: vi.fn().mockResolvedValue({}) },
    referralCreditLedger: {
      findMany: vi.fn().mockResolvedValue(options.applications ?? []),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    clientNotification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as any
  return db
}

describe('handlePaymentReversed', () => {
  it('marca el referido en revisión y sus recompensas', async () => {
    const db = reversalDb({
      referralPayment: {
        role: 'second',
        referral: {
          id: 'r1',
          referrerClientId: 'c1',
          status: 'valid',
          flagged: false,
          flagReason: null,
          validatedAt: new Date('2026-02-01'),
        },
      },
    })
    const result = await handlePaymentReversed('p1', db)
    expect(result).toMatchObject({ referralAffected: true, rewardsFlagged: 1 })
    expect(db.referral.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: expect.objectContaining({
        flagged: true,
        flagReason: 'payment_refunded',
        status: 'pending_second_payment',
        validatedAt: null,
      }),
    })
    expect(db.referralReward.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: { reviewRequired: true },
    })
    expect(db.referralAuditLog.create).toHaveBeenCalled()
  })

  it('no falla si el pago no validó ningún referido', async () => {
    const db = reversalDb({})
    await expect(handlePaymentReversed('p1', db)).resolves.toMatchObject({
      referralAffected: false,
      rewardsFlagged: 0,
    })
  })

  it('revierte el crédito aplicado y devuelve el saldo a la recompensa', async () => {
    const db = reversalDb({
      applications: [
        {
          clientId: 'c1',
          rewardId: 'w1',
          currency: 'CLP',
          amount: -5000,
          fxRate: null,
        },
      ],
      reward: { id: 'w1', amount: 10000, remainingAmount: 5000, status: 'available', appliedAt: null },
    })
    const result = await handlePaymentReversed('p1', db)
    expect(result.creditReversed).toBe(5000)
    expect(db.referralCreditLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'adjustment', amount: 5000 }),
    })
    expect(db.referralReward.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: expect.objectContaining({ remainingAmount: 10000, status: 'available' }),
    })
  })

  it('no encuentra el pago y no hace nada', async () => {
    const db = reversalDb({})
    db.payment.findUnique.mockResolvedValue(null)
    await expect(handlePaymentReversed('missing', db)).resolves.toEqual({
      referralAffected: false,
      rewardsFlagged: 0,
      creditReversed: 0,
    })
  })
})
