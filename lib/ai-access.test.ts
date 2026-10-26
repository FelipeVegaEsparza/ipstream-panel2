import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clientFindUnique: vi.fn(),
  getAiCreditBalance: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findUnique: mocks.clientFindUnique },
  },
}))

vi.mock('@/lib/ai-credits', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ai-credits')>()
  return { ...actual, getAiCreditBalance: mocks.getAiCreditBalance }
})

import { getAiLiveAccess } from './ai-live'
import { getAiMusicAccess } from './ai-music'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAiCreditBalance.mockResolvedValue({ characters: 0, musicSeconds: 0 })
})

describe('cuota efectiva de IA', () => {
  it('suma cuota restante del plan y saldo adicional de caracteres', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      plan: { aiLiveEnabled: true, aiMonthlyCharacters: 100 },
      aiTtsUsage: [{ characters: 80 }],
    })
    mocks.getAiCreditBalance.mockResolvedValue({ characters: 30, musicSeconds: 0 })

    await expect(getAiLiveAccess('client-a')).resolves.toMatchObject({
      enabled: true,
      limit: 100,
      used: 80,
      planRemaining: 20,
      extraRemaining: 30,
      remaining: 50,
      totalUsed: 80,
    })
  })

  it('suma cuota restante del plan y saldo adicional de música', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      plan: { aiLiveEnabled: true, aiMusicMinutes: 10 },
      aiTtsUsage: [{ musicSeconds: 500 }],
    })
    mocks.getAiCreditBalance.mockResolvedValue({ characters: 0, musicSeconds: 120 })

    await expect(getAiMusicAccess('client-a')).resolves.toMatchObject({
      enabled: true,
      limitSeconds: 600,
      usedSeconds: 500,
      planRemainingSeconds: 100,
      extraRemainingSeconds: 120,
      remainingSeconds: 220,
      totalUsedSeconds: 500,
    })
  })

  it('habilita la IA si el plan tiene el flag y solo hay saldo adicional', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      plan: { aiLiveEnabled: true, aiMonthlyCharacters: 0 },
      aiTtsUsage: [],
    })
    mocks.getAiCreditBalance.mockResolvedValue({ characters: 100, musicSeconds: 0 })

    await expect(getAiLiveAccess('client-a')).resolves.toMatchObject({
      enabled: true,
      limit: 0,
      remaining: 100,
    })
  })

  it('no habilita la IA si el plan no la incluye aunque haya saldo', async () => {
    mocks.clientFindUnique.mockResolvedValue({
      plan: { aiLiveEnabled: false, aiMonthlyCharacters: 0 },
      aiTtsUsage: [],
    })
    mocks.getAiCreditBalance.mockResolvedValue({ characters: 100, musicSeconds: 0 })

    await expect(getAiLiveAccess('client-a')).resolves.toMatchObject({
      enabled: false,
      remaining: 0,
    })
  })
})
