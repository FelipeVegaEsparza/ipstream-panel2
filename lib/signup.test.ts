import { describe, expect, it, vi } from 'vitest'

vi.mock('./prisma', () => ({ prisma: {} }))
vi.mock('./resend', () => ({ sendEmail: vi.fn() }))

const { createSignupSubscription } = await import('./signup')

function fakeDb() {
  const subscriptionCreate = vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: 'sub1',
    ...args.data,
  }))
  const paymentCreate = vi.fn(async (args: { data: Record<string, unknown> }) => ({
    id: 'pay1',
    ...args.data,
  }))
  return {
    subscription: { create: subscriptionCreate },
    client: { update: vi.fn(async () => ({})) },
    payment: { create: paymentCreate },
    radioStream: { updateMany: vi.fn(async () => ({})) },
    videoStream: { updateMany: vi.fn(async () => ({})) },
    subscriptionCreate,
    paymentCreate,
  }
}

describe('createSignupSubscription', () => {
  it('activa la cuenta 24 horas y crea el pago pendiente en la moneda elegida', async () => {
    const db = fakeDb()
    const before = Date.now()

    const result = await createSignupSubscription(
      db as never,
      'client1',
      {
        id: 'plan1',
        name: 'Plan Radio IA 500k',
        price: 29990,
        currency: 'CLP',
        interval: 'monthly',
        radioStorageQuotaMB: 60000,
        videoStorageQuotaMB: null,
      },
      { currency: 'USD', amount: 30 }
    )

    const after = Date.now()
    const subscription = db.subscriptionCreate.mock.calls[0][0].data
    const payment = db.paymentCreate.mock.calls[0][0].data
    const dueAt = new Date(subscription.endDate as Date).getTime()

    expect(subscription.status).toBe('active')
    expect(subscription.trialEndsAt).toBeNull()
    expect(dueAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 1000)
    expect(dueAt).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 1000)

    expect(payment.status).toBe('pending')
    expect(payment.currency).toBe('USD')
    expect(payment.amount).toBe(30)
    expect(new Date(payment.dueDate as Date).getTime()).toBe(dueAt)
    expect(result).not.toHaveProperty('isTrial')
  })
})
