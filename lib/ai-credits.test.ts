import { describe, expect, it, vi } from 'vitest'
import {
  consumeExtraCharacters,
  consumeExtraMusicSeconds,
  getAiCreditBalance,
  packCreditSnapshot,
} from './ai-credits'
import { shouldShowAiCreditUpsell } from './ai-credit-upsell'

function fakeDb(grants: Array<Record<string, unknown>>) {
  return {
    aiCreditGrant: {
      findMany: vi.fn().mockResolvedValue(grants),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      aggregate: vi.fn(),
    },
  } as any
}

describe('packCreditSnapshot', () => {
  it('convierte paquetes de caracteres y de música', () => {
    expect(packCreditSnapshot({ creditType: 'characters', amount: 500 })).toEqual({
      characters: 500,
      musicSeconds: 0,
    })
    expect(packCreditSnapshot({ creditType: 'music', amount: 15 })).toEqual({
      characters: 0,
      musicSeconds: 900,
    })
  })
})

describe('getAiCreditBalance', () => {
  it('suma los saldos de todos los otorgamientos', async () => {
    const db = fakeDb([])
    db.aiCreditGrant.aggregate.mockResolvedValue({
      _sum: { remainingCharacters: 120, remainingMusicSeconds: 300 },
    })

    await expect(getAiCreditBalance('client-a', db)).resolves.toEqual({
      characters: 120,
      musicSeconds: 300,
    })
  })
})

describe('consumeExtraCharacters', () => {
  it('descuenta primero el otorgamiento más antiguo', async () => {
    const db = fakeDb([
      { id: 'g1', remainingCharacters: 10 },
      { id: 'g2', remainingCharacters: 20 },
    ])

    await consumeExtraCharacters(db, 'client-a', 15)

    expect(db.aiCreditGrant.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'g1', remainingCharacters: { gte: 10 } },
      data: { remainingCharacters: { decrement: 10 } },
    })
    expect(db.aiCreditGrant.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'g2', remainingCharacters: { gte: 5 } },
      data: { remainingCharacters: { decrement: 5 } },
    })
  })

  it('no deja saldos negativos y falla si no alcanza', async () => {
    const db = fakeDb([{ id: 'g1', remainingCharacters: 10 }])

    await expect(consumeExtraCharacters(db, 'client-a', 11)).rejects.toThrow(
      'insufficient_ai_credits'
    )
    expect(db.aiCreditGrant.updateMany).toHaveBeenCalledTimes(1)
  })

  it('no hace nada con consumo cero', async () => {
    const db = fakeDb([])
    await consumeExtraCharacters(db, 'client-a', 0)
    expect(db.aiCreditGrant.findMany).not.toHaveBeenCalled()
  })
})

describe('consumeExtraMusicSeconds', () => {
  it('consume música de forma independiente', async () => {
    const db = fakeDb([{ id: 'g1', remainingMusicSeconds: 60 }])

    await consumeExtraMusicSeconds(db, 'client-a', 30)

    expect(db.aiCreditGrant.updateMany).toHaveBeenCalledWith({
      where: { id: 'g1', remainingMusicSeconds: { gte: 30 } },
      data: { remainingMusicSeconds: { decrement: 30 } },
    })
  })
})


describe('shouldShowAiCreditUpsell', () => {
  it('no muestra aviso sin paquetes activos', () => {
    expect(
      shouldShowAiCreditUpsell({
        charactersEnabled: true,
        charactersRemaining: 0,
        activePacks: 0,
      })
    ).toBe(false)
  })

  it('muestra aviso cuando una cuota habilitada llega a cero', () => {
    expect(
      shouldShowAiCreditUpsell({
        charactersEnabled: true,
        charactersRemaining: 0,
        activePacks: 1,
      })
    ).toBe(true)
  })

  it('no muestra aviso si todavía hay saldo en las cuotas habilitadas', () => {
    expect(
      shouldShowAiCreditUpsell({
        charactersEnabled: true,
        charactersRemaining: 20,
        activePacks: 2,
      })
    ).toBe(false)
  })
})
