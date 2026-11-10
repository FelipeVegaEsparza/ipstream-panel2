import { describe, expect, it } from 'vitest'
import { musicTrackWhere, parseRuleInput } from './news-capsules/service'

describe('news capsule service', () => {
  it('limita la música a pistas globales o del cliente', () => {
    const where = musicTrackWhere('client-1', 'track-1')
    expect(where).toMatchObject({
      id: 'track-1',
      active: true,
      OR: [{ clientId: null }, { clientId: 'client-1' }],
    })
  })

  it('valida reglas por temas, horas e intervalo', () => {
    const rules = parseRuleInput([
      { kind: 'tracks', config: { everyTracks: 5 } },
      { kind: 'times', config: { times: ['08:00', '14:30'] } },
      { kind: 'interval_hours', config: { everyHours: 2, startAt: '07:00' } },
    ])
    expect(rules).toHaveLength(3)
    expect(rules[1].config.times).toEqual(['08:00', '14:30'])
  })

  it('rechaza reglas inválidas', () => {
    expect(() => parseRuleInput([{ kind: 'tracks', config: { everyTracks: 0 } }])).toThrow()
    expect(() => parseRuleInput([{ kind: 'times', config: { times: ['25:00'] } }])).toThrow()
    expect(() => parseRuleInput([{ kind: 'interval_hours', config: { everyHours: 30 } }])).toThrow()
  })
})
