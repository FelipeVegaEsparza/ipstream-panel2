import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  eventCreate: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiTtsUsage: { upsert: mocks.upsert },
    aiUsageEvent: { create: mocks.eventCreate },
    $transaction: mocks.transaction,
  },
}))

import { aiPeriod, consumeAiCharacters } from './ai-live'
import { consumeAiMusicSeconds } from './ai-music'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.upsert.mockResolvedValue({})
  mocks.eventCreate.mockResolvedValue({})
  mocks.transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
    Promise.all(operations)
  )
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

  it('no registra nada cuando el consumo es cero', async () => {
    await consumeAiCharacters('client-a', 0, 'live-announce')
    await consumeAiMusicSeconds('client-a', 0, 'ai-capsule')

    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.eventCreate).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
