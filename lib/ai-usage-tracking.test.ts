import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clientFindUnique: vi.fn(),
  usageFindUnique: vi.fn(),
  upsert: vi.fn(),
  eventCreate: vi.fn(),
  grantFindMany: vi.fn(),
  grantUpdateMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiTtsUsage: { upsert: mocks.upsert, findUnique: mocks.usageFindUnique },
    aiUsageEvent: { create: mocks.eventCreate },
    aiCreditGrant: { findMany: mocks.grantFindMany, updateMany: mocks.grantUpdateMany },
    client: { findUnique: mocks.clientFindUnique },
    $transaction: mocks.transaction,
  },
}))

import { aiPeriod, consumeAiCharacters } from './ai-live'
import { consumeAiMusicSeconds } from './ai-music'

function tx() {
  return {
    client: { findUnique: mocks.clientFindUnique },
    aiTtsUsage: { findUnique: mocks.usageFindUnique, upsert: mocks.upsert },
    aiUsageEvent: { create: mocks.eventCreate },
    aiCreditGrant: { findMany: mocks.grantFindMany, updateMany: mocks.grantUpdateMany },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.clientFindUnique.mockResolvedValue({
    plan: { aiLiveEnabled: true, aiMonthlyCharacters: 1000, aiMusicMinutes: 10 },
  })
  mocks.usageFindUnique.mockResolvedValue(null)
  mocks.upsert.mockResolvedValue({})
  mocks.eventCreate.mockResolvedValue({})
  mocks.grantFindMany.mockResolvedValue([])
  mocks.grantUpdateMany.mockResolvedValue({ count: 1 })
  mocks.transaction.mockImplementation(async (fn: (client: ReturnType<typeof tx>) => Promise<void>) => fn(tx()))
})

describe('registro de consumo de IA', () => {
  it('registra caracteres en el total y en el evento de detalle', async () => {
    await consumeAiCharacters('client-a', 42, 'live-locution')

    const period = aiPeriod()
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { clientId_period: { clientId: 'client-a', period } },
      create: { clientId: 'client-a', period, characters: 42, requests: 1 },
      update: { characters: { increment: 42 }, requests: { increment: 1 } },
    })
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: {
        clientId: 'client-a',
        period,
        feature: 'live-locution',
        characters: 42,
      },
    })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
  })

  it('registra segundos de música en el total y en el evento de detalle', async () => {
    await consumeAiMusicSeconds('client-a', 15, 'ai-jingle')

    const period = aiPeriod()
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { clientId_period: { clientId: 'client-a', period } },
      create: { clientId: 'client-a', period, musicSeconds: 15, requests: 1 },
      update: { musicSeconds: { increment: 15 }, requests: { increment: 1 } },
    })
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: {
        clientId: 'client-a',
        period,
        feature: 'ai-jingle',
        musicSeconds: 15,
      },
    })
  })

  it('reparte el consumo entre plan y saldo adicional', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      plan: { aiLiveEnabled: true, aiMonthlyCharacters: 100, aiMusicMinutes: 0 },
    })
    mocks.usageFindUnique.mockResolvedValue({ characters: 80 })
    mocks.grantFindMany.mockResolvedValue([{ id: 'g1', remainingCharacters: 30 }])

    await consumeAiCharacters('client-a', 50, 'autodj-presenter')

    expect(mocks.grantUpdateMany).toHaveBeenCalledWith({
      where: { id: 'g1', remainingCharacters: { gte: 30 } },
      data: { remainingCharacters: { decrement: 30 } },
    })
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { characters: { increment: 50 }, requests: { increment: 1 } },
      })
    )
  })

  it('revierte si el saldo adicional no alcanza', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      plan: { aiLiveEnabled: true, aiMonthlyCharacters: 0, aiMusicMinutes: 0 },
    })
    mocks.grantFindMany.mockResolvedValue([{ id: 'g1', remainingCharacters: 10 }])

    await expect(consumeAiCharacters('client-a', 20, 'live-locution')).rejects.toThrow(
      'insufficient_ai_credits'
    )
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })

  it('no registra nada cuando el consumo es cero', async () => {
    await consumeAiCharacters('client-a', 0, 'live-announce')
    await consumeAiMusicSeconds('client-a', 0, 'ai-capsule')

    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.eventCreate).not.toHaveBeenCalled()
  })
})
