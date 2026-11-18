import { beforeEach, describe, expect, it, vi } from 'vitest'

const { onPaymentConfirmed, sendAccountEmail, prismaMock } = vi.hoisted(() => ({
  onPaymentConfirmed: vi.fn(),
  sendAccountEmail: vi.fn(),
  prismaMock: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    subscription: { update: vi.fn() },
    $transaction: vi.fn(),
  } as any,
}))

vi.mock('./referrals/validation', () => ({ onPaymentConfirmed }))
vi.mock('./email-hooks', () => ({ sendAccountEmail }))
vi.mock('./prisma', () => ({ prisma: prismaMock }))

import { markPaymentPaid } from './billing-payments'
import { completePaymentAndGenerateNext } from './payment-generator'

const payment = {
  id: 'p1',
  clientId: 'c1',
  amount: 10000,
  currency: 'CLP',
  status: 'pending',
  subscriptionId: 'sub-1',
  subscription: {
    id: 'sub-1',
    status: 'trialing',
    startDate: new Date('2026-01-01'),
    plan: { interval: 'monthly', price: 10000, currency: 'CLP', name: 'Plan' },
  },
  dueDate: new Date('2026-01-01'),
  description: 'Pago mensual',
  paidAt: null,
  transactionId: null,
  receiptUrl: null,
}

beforeEach(() => {
  onPaymentConfirmed.mockReset()
  onPaymentConfirmed.mockResolvedValue(undefined)
  sendAccountEmail.mockReset()
  prismaMock.payment.findUnique.mockReset()
  prismaMock.payment.update.mockReset()
  prismaMock.subscription.update.mockReset()
  prismaMock.$transaction.mockReset()
})

describe('markPaymentPaid', () => {
  it('confirma el pago y dispara el hook de referidos', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment)
    prismaMock.payment.update.mockResolvedValue({ ...payment, status: 'completed' })

    const result = await markPaymentPaid('p1', { method: 'paypal', transactionId: 'TX-1' })

    expect(result).toMatchObject({ status: 'completed' })
    expect(onPaymentConfirmed).toHaveBeenCalledWith('p1')
  })

  it('no rompe la confirmación si el hook de referidos falla', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(payment)
    prismaMock.payment.update.mockResolvedValue({ ...payment, status: 'completed' })
    onPaymentConfirmed.mockRejectedValue(new Error('boom'))

    await expect(
      markPaymentPaid('p1', { method: 'paypal', transactionId: 'TX-1' })
    ).resolves.toMatchObject({ status: 'completed' })
  })

  it('es idempotente y no vuelve a disparar el hook si ya estaba pagado', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({ ...payment, status: 'completed' })
    await markPaymentPaid('p1', { method: 'paypal' })
    expect(prismaMock.payment.update).not.toHaveBeenCalled()
    expect(onPaymentConfirmed).not.toHaveBeenCalled()
  })
})

describe('completePaymentAndGenerateNext', () => {
  it('dispara el hook después del commit y del siguiente pago', async () => {
    const tx = {
      payment: {
        findUnique: vi.fn().mockResolvedValue(payment),
        update: vi.fn().mockResolvedValue({ ...payment, status: 'completed' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'p2', status: 'pending' }),
      },
      subscription: { update: vi.fn().mockResolvedValue({}) },
    }
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx))

    const result = await completePaymentAndGenerateNext(
      prismaMock,
      'p1',
      'manual'
    )

    expect(result.nextPayment).toMatchObject({ id: 'p2' })
    expect(onPaymentConfirmed).toHaveBeenCalledWith('p1')
  })

  it('no rompe la operación si el hook falla', async () => {
    const tx = {
      payment: {
        findUnique: vi.fn().mockResolvedValue(payment),
        update: vi.fn().mockResolvedValue({ ...payment, status: 'completed' }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'p2', status: 'pending' }),
      },
      subscription: { update: vi.fn().mockResolvedValue({}) },
    }
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx))
    onPaymentConfirmed.mockRejectedValue(new Error('boom'))

    await expect(
      completePaymentAndGenerateNext(prismaMock, 'p1', 'manual')
    ).resolves.toMatchObject({ nextPayment: { id: 'p2' } })
  })
})
