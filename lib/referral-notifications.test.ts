import { describe, expect, it, vi } from 'vitest'
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllRead,
  markNotificationRead,
  notifyClient,
} from './notifications'
import {
  notifyCreditApplied,
  notifyReferralFirstPayment,
  notifyReferralRegistered,
  notifyReferralValid,
  notifyRewardGenerated,
} from './referrals/events'

function db() {
  return {
    clientNotification: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(3),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as any
}

describe('notifyClient', () => {
  it('crea la notificación con eventKey y skipDuplicates', async () => {
    const fake = db()
    const result = await notifyClient(
      'c1',
      { type: 'x', title: 'T', message: 'M', link: '/x', eventKey: 'evt-1' },
      fake
    )
    expect(result).toEqual({ created: true })
    expect(fake.clientNotification.createMany).toHaveBeenCalledWith({
      data: [
        {
          clientId: 'c1',
          type: 'x',
          title: 'T',
          message: 'M',
          link: '/x',
          eventKey: 'evt-1',
        },
      ],
      skipDuplicates: true,
    })
  })

  it('no duplica ante reintentos del mismo evento', async () => {
    const fake = db()
    fake.clientNotification.createMany.mockResolvedValue({ count: 0 })
    await expect(
      notifyClient('c1', { type: 'x', title: 'T', message: 'M', eventKey: 'evt-1' }, fake)
    ).resolves.toEqual({ created: false })
  })

  it('no hace nada sin cliente', async () => {
    const fake = db()
    await expect(
      notifyClient(null, { type: 'x', title: 'T', message: 'M', eventKey: 'evt-1' }, fake)
    ).resolves.toEqual({ created: false, reason: 'no_client' })
    expect(fake.clientNotification.createMany).not.toHaveBeenCalled()
  })
})

describe('consultas y lectura', () => {
  it('lista solo las notificaciones del cliente', async () => {
    const fake = db()
    await listNotifications('c1', { unreadOnly: true, limit: 10 }, fake)
    expect(fake.clientNotification.findMany).toHaveBeenCalledWith({
      where: { clientId: 'c1', readAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
  })

  it('cuenta las no leídas del cliente', async () => {
    const fake = db()
    await expect(getUnreadNotificationCount('c1', fake)).resolves.toBe(3)
    expect(fake.clientNotification.count).toHaveBeenCalledWith({
      where: { clientId: 'c1', readAt: null },
    })
  })

  it('marca una notificación solo si pertenece al cliente', async () => {
    const fake = db()
    await markNotificationRead('c1', 'n1', fake)
    expect(fake.clientNotification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', clientId: 'c1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })

  it('marca todas las del cliente', async () => {
    const fake = db()
    await markAllRead('c1', fake)
    expect(fake.clientNotification.updateMany).toHaveBeenCalledWith({
      where: { clientId: 'c1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})

describe('eventos del programa', () => {
  it('genera claves de evento deterministas para referidos y recompensas', async () => {
    const fake = db()
    await notifyReferralRegistered(
      { referralId: 'r1', referrerClientId: 'c1', referredName: 'Radio Nueva' },
      fake
    )
    await notifyReferralFirstPayment(
      { referralId: 'r1', referrerClientId: 'c1', referredName: 'Radio Nueva' },
      fake
    )
    await notifyReferralValid(
      { referralId: 'r1', referrerClientId: 'c1', referredName: 'Radio Nueva' },
      fake
    )
    await notifyRewardGenerated(
      { rewardId: 'w1', clientId: 'c1', months: 1, amount: 10000, currency: 'CLP' },
      fake
    )
    await notifyCreditApplied(
      {
        rewardId: 'w1',
        paymentId: 'p1',
        clientId: 'c1',
        amount: 10000,
        currency: 'CLP',
        remaining: 0,
      },
      fake
    )

    const keys = fake.clientNotification.createMany.mock.calls.map(
      (call: any[]) => call[0].data[0].eventKey
    )
    expect(keys).toEqual([
      'referral:r1:registered',
      'referral:r1:first_paid',
      'referral:r1:valid',
      'reward:w1:created',
      'credit:w1:p1',
    ])
  })

  it('informa el monto aplicado y el saldo restante', async () => {
    const fake = db()
    await notifyCreditApplied(
      {
        rewardId: 'w1',
        paymentId: 'p1',
        clientId: 'c1',
        amount: 5000,
        currency: 'CLP',
        remaining: 5000,
      },
      fake
    )
    const data = fake.clientNotification.createMany.mock.calls[0][0].data[0]
    expect(data.message).toContain('5.000')
    expect(data.message).toContain('5.000')
  })
})
