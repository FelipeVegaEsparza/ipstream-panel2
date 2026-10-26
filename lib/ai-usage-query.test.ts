import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  aiTtsFindMany: vi.fn(),
  aiUsageGroupBy: vi.fn(),
  clientFindMany: vi.fn(),
  getAiLiveAccess: vi.fn(),
  getAiMusicAccess: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    aiTtsUsage: { findMany: mocks.aiTtsFindMany },
    aiUsageEvent: { groupBy: mocks.aiUsageGroupBy },
    client: { findMany: mocks.clientFindMany },
  },
}))

vi.mock('@/lib/ai-live', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ai-live')>()
  return { ...actual, getAiLiveAccess: mocks.getAiLiveAccess }
})

vi.mock('@/lib/ai-music', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ai-music')>()
  return { ...actual, getAiMusicAccess: mocks.getAiMusicAccess }
})

import { buildPeriodRange, getAdminAiUsage, getClientAiUsage } from './ai-usage'
import { aiPeriod } from './ai-live'

function liveAccess(used: number) {
  return { enabled: true, limit: 1000, used, remaining: 1000 - used, period: aiPeriod() }
}

function musicAccess(usedSeconds: number) {
  return {
    enabled: true,
    limitSeconds: 600,
    usedSeconds,
    remainingSeconds: 600 - usedSeconds,
    period: aiPeriod(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAiLiveAccess.mockImplementation(async (_clientId: string) => liveAccess(0))
  mocks.getAiMusicAccess.mockImplementation(async (_clientId: string) => musicAccess(0))
  mocks.aiUsageGroupBy.mockResolvedValue([])
  mocks.clientFindMany.mockResolvedValue([])
})

describe('getClientAiUsage', () => {
  it('consulta solo el cliente indicado y arma cuotas, desglose e historial', async () => {
    const period = aiPeriod()
    mocks.aiTtsFindMany.mockResolvedValue([
      { period, characters: 100, musicSeconds: 20, requests: 3 },
    ])
    mocks.aiUsageGroupBy.mockResolvedValue([
      {
        feature: 'live-locution',
        _sum: { characters: 60, musicSeconds: 0 },
        _count: { _all: 2 },
      },
    ])
    mocks.getAiLiveAccess.mockResolvedValue(liveAccess(100))
    mocks.getAiMusicAccess.mockResolvedValue(musicAccess(20))

    const result = await getClientAiUsage('client-a')

    expect(mocks.aiTtsFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-a' }) })
    )
    expect(mocks.aiUsageGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'client-a', period },
      })
    )
    expect(mocks.getAiLiveAccess).toHaveBeenCalledWith('client-a')
    expect(mocks.getAiMusicAccess).toHaveBeenCalledWith('client-a')
    expect(result.current.characters).toBe(100)
    expect(result.quotas.characters.used).toBe(100)
    expect(result.current.breakdown.find((row) => row.feature === 'unattributed')).toMatchObject({
      characters: 40,
      musicSeconds: 20,
    })
    expect(result.history).toHaveLength(7)
    expect(result.history[0]).toMatchObject({ period, characters: 100, musicSeconds: 20 })
  })
})

describe('getAdminAiUsage', () => {
  it('suma los clientes del mes, arma el ranking y excluye clientes sin consumo', async () => {
    const period = aiPeriod()
    mocks.aiTtsFindMany.mockResolvedValue([
      { clientId: 'c1', period, characters: 80, musicSeconds: 10, requests: 2 },
      { clientId: 'c2', period, characters: 20, musicSeconds: 5, requests: 1 },
      { clientId: 'c3', period, characters: 0, musicSeconds: 0, requests: 0 },
      { clientId: 'c1', period: buildPeriodRange(period, 2)[1], characters: 5, musicSeconds: 0, requests: 1 },
    ])
    mocks.aiUsageGroupBy.mockResolvedValue([
      {
        feature: 'ai-jingle',
        _sum: { characters: 100, musicSeconds: 15 },
        _count: { _all: 3 },
      },
    ])
    mocks.clientFindMany.mockResolvedValue([
      { id: 'c1', name: 'Radio Uno', basicData: { projectName: 'Uno FM' } },
      { id: 'c2', name: 'Radio Dos', basicData: null },
      { id: 'c3', name: 'Radio Tres', basicData: null },
    ])

    const result = await getAdminAiUsage()

    expect(result.current).toMatchObject({ characters: 100, musicSeconds: 15, requests: 3 })
    expect(result.clients.map((client) => client.clientId)).toEqual(['c1', 'c2'])
    expect(result.clients[0]).toMatchObject({ name: 'Uno FM', characters: 80 })
    expect(result.current.breakdown.some((row) => row.feature === 'unattributed')).toBe(false)
    expect(result.history).toHaveLength(7)
  })
})
