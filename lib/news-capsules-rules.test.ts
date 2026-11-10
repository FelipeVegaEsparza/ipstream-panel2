import { describe, expect, it } from 'vitest'
import {
  evaluateCapsule,
  isWithinWindow,
  nextEmissionAt,
  pickDueCapsules,
  type NewsCapsuleScheduleData,
} from './news-capsules/rules'

function capsule(overrides: Partial<NewsCapsuleScheduleData> = {}): NewsCapsuleScheduleData {
  return {
    id: 'c1',
    title: 'Cápsula',
    status: 'approved',
    priority: 5,
    minGapMinutes: 30,
    graceMinutes: 10,
    windowStart: null,
    windowEnd: null,
    activeFrom: null,
    activeTo: null,
    rules: [
      { id: 'r1', kind: 'times', config: { times: ['14:00'] }, days: null, active: true },
    ],
    lastPlayedAt: null,
    ...overrides,
  }
}

describe('news capsule rules', () => {
  it('está dentro de la ventana horaria', () => {
    const c = capsule({ windowStart: '08:00', windowEnd: '20:00' })
    expect(isWithinWindow(c, new Date('2026-11-10T14:00:00Z'), 'UTC')).toBe(true)
    expect(isWithinWindow(c, new Date('2026-11-10T22:00:00Z'), 'UTC')).toBe(false)
  })

  it('evalúa la hora en la zona horaria del cliente', () => {
    const c = capsule({
      rules: [{ id: 'tz', kind: 'times', config: { times: ['14:00'] }, days: null, active: true }],
    })
    const due = evaluateCapsule(c, {
      now: new Date('2026-11-10T17:05:00Z'),
      timezone: 'America/Santiago',
      tracksSinceLastPlay: 0,
    })
    expect(due.due).toBe(true)
  })

  it('detecta una hora específica dentro de la gracia', () => {
    const c = capsule()
    const due = evaluateCapsule(c, {
      now: new Date('2026-11-10T14:05:00Z'),
      timezone: 'UTC',
      tracksSinceLastPlay: 0,
    })
    expect(due.due).toBe(true)
    expect(due.scheduledFor?.toISOString()).toBe('2026-11-10T14:00:00.000Z')
  })

  it('omite una hora vencida', () => {
    const c = capsule()
    const due = evaluateCapsule(c, {
      now: new Date('2026-11-10T14:11:00Z'),
      timezone: 'UTC',
      tracksSinceLastPlay: 0,
    })
    expect(due.due).toBe(false)
  })

  it('evalúa reglas por temas', () => {
    const c = capsule({
      rules: [{ id: 'r2', kind: 'tracks', config: { everyTracks: 5 }, days: null, active: true }],
    })
    expect(evaluateCapsule(c, { now: new Date(), timezone: 'UTC', tracksSinceLastPlay: 5 }).due).toBe(true)
    expect(evaluateCapsule(c, { now: new Date(), timezone: 'UTC', tracksSinceLastPlay: 4 }).due).toBe(false)
  })

  it('evalúa intervalos de horas', () => {
    const c = capsule({
      rules: [{ id: 'r3', kind: 'interval_hours', config: { everyHours: 2, startAt: '00:00' }, days: null, active: true }],
    })
    expect(evaluateCapsule(c, { now: new Date('2026-11-10T14:04:00Z'), timezone: 'UTC', tracksSinceLastPlay: 0 }).due).toBe(true)
  })

  it('respeta el cooldown', () => {
    const c = capsule({ lastPlayedAt: new Date('2026-11-10T13:50:00Z') })
    expect(evaluateCapsule(c, { now: new Date('2026-11-10T14:05:00Z'), timezone: 'UTC', tracksSinceLastPlay: 0 }).due).toBe(false)
  })

  it('ordena candidatas por prioridad', () => {
    const low = capsule({ id: 'low', priority: 1 })
    const high = capsule({ id: 'high', priority: 9 })
    const result = pickDueCapsules([low, high], { now: new Date('2026-11-10T14:05:00Z'), timezone: 'UTC', tracksSinceLastPlay: 0 })
    expect(result[0].capsule.id).toBe('high')
  })

  it('calcula la próxima emisión', () => {
    const next = nextEmissionAt(capsule(), new Date('2026-11-10T15:00:00Z'), 'UTC')
    expect(next?.toISOString()).toBe('2026-11-11T14:00:00.000Z')
  })
})
