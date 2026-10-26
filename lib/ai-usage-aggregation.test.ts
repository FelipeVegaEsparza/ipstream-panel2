import { describe, expect, it } from 'vitest'
import {
  aggregateMonthlyTotals,
  buildClientRanking,
  buildFeatureBreakdown,
  emptyAiUsageTotals,
} from './ai-usage'

describe('buildFeatureBreakdown', () => {
  it('incluye todas las funciones y calcula el remanente sin detalle', () => {
    const breakdown = buildFeatureBreakdown(
      { characters: 100, musicSeconds: 30, requests: 4 },
      [
        { feature: 'live-locution', characters: 60, musicSeconds: 0, requests: 2 },
        { feature: 'ai-jingle', characters: 10, musicSeconds: 20, requests: 1 },
      ]
    )

    expect(breakdown).toHaveLength(6)
    expect(breakdown.find((row) => row.feature === 'live-locution')).toMatchObject({
      characters: 60,
      musicSeconds: 0,
    })
    expect(breakdown.find((row) => row.feature === 'ai-jingle')).toMatchObject({
      characters: 10,
      musicSeconds: 20,
    })
    expect(breakdown.find((row) => row.feature === 'unattributed')).toEqual({
      feature: 'unattributed',
      characters: 30,
      musicSeconds: 10,
      requests: 1,
    })
  })

  it('no muestra remanente cuando el detalle coincide con el total', () => {
    const breakdown = buildFeatureBreakdown(
      { characters: 70, musicSeconds: 20, requests: 3 },
      [
        { feature: 'live-locution', characters: 60, musicSeconds: 0, requests: 2 },
        { feature: 'ai-jingle', characters: 10, musicSeconds: 20, requests: 1 },
      ]
    )

    expect(breakdown.some((row) => row.feature === 'unattributed')).toBe(false)
    expect(
      breakdown.reduce((sum, row) => sum + row.characters, 0)
    ).toBe(70)
  })
})

describe('aggregateMonthlyTotals', () => {
  it('suma por período y rellena con cero los meses sin datos', () => {
    const history = aggregateMonthlyTotals(
      [
        { period: '2026-10', characters: 10, musicSeconds: 5, requests: 1 },
        { period: '2026-10', characters: 5, musicSeconds: 1, requests: 1 },
        { period: '2026-08', characters: 20, musicSeconds: 0, requests: 2 },
      ],
      ['2026-10', '2026-09', '2026-08']
    )

    expect(history).toEqual([
      { period: '2026-10', characters: 15, musicSeconds: 6, requests: 2 },
      { period: '2026-09', ...emptyAiUsageTotals() },
      { period: '2026-08', characters: 20, musicSeconds: 0, requests: 2 },
    ])
  })
})

describe('buildClientRanking', () => {
  it('agrupa por cliente, ordena por consumo y excluye clientes sin uso', () => {
    const names = new Map([
      ['c1', 'Radio Uno'],
      ['c2', 'Radio Dos'],
      ['c3', 'Radio Tres'],
    ])
    const ranking = buildClientRanking(
      [
        { clientId: 'c1', characters: 10, musicSeconds: 5, requests: 1 },
        { clientId: 'c2', characters: 50, musicSeconds: 0, requests: 2 },
        { clientId: 'c1', characters: 20, musicSeconds: 10, requests: 1 },
        { clientId: 'c3', characters: 0, musicSeconds: 0, requests: 0 },
      ],
      names
    )

    expect(ranking.map((client) => client.clientId)).toEqual(['c2', 'c1'])
    expect(ranking.find((client) => client.clientId === 'c1')).toMatchObject({
      name: 'Radio Uno',
      characters: 30,
      musicSeconds: 15,
      requests: 2,
    })
  })

  it('usa el id como nombre si no encuentra el cliente', () => {
    const ranking = buildClientRanking(
      [{ clientId: 'sin-nombre', characters: 5, musicSeconds: 0, requests: 1 }],
      new Map()
    )

    expect(ranking[0].name).toBe('sin-nombre')
  })
})
