import { describe, expect, it } from 'vitest'
import {
  localDayKey,
  resolveRange,
  startOfLocalDay,
  summarize,
  type SeriesPoint,
} from './analytics'

function point(overrides: Partial<SeriesPoint> & { bucket: string }): SeriesPoint {
  return {
    listenersAvg: 0,
    listenersMax: 0,
    listenerMinutes: 0,
    sessions: 0,
    airtimeSeconds: 0,
    ...overrides,
  }
}

describe('summarize', () => {
  it('exposes the field names the dashboard consumes', () => {
    const summary = summarize([], 0)

    expect(Object.keys(summary).sort()).toEqual(
      [
        'airtimeSeconds',
        'listenerMinutes',
        'listenersAvg',
        'listenersMax',
        'sessions',
        'totalBuckets',
        'uniqueListeners',
      ].sort()
    )
  })

  it('aggregates the period with a time-weighted average', () => {
    const points = [
      point({
        bucket: '2026-11-16',
        listenersAvg: 2,
        listenersMax: 4,
        listenerMinutes: 120,
        sessions: 3,
        airtimeSeconds: 3600,
      }),
      point({
        bucket: '2026-11-17',
        listenersAvg: 4,
        listenersMax: 6,
        listenerMinutes: 240,
        sessions: 5,
        airtimeSeconds: 7200,
      }),
    ]

    const summary = summarize(points, 7)

    expect(summary).toEqual({
      listenersAvg: 3.3,
      listenersMax: 6,
      listenerMinutes: 360,
      sessions: 8,
      airtimeSeconds: 10800,
      uniqueListeners: 7,
      totalBuckets: 2,
    })
  })

  it('returns zeros when the period has no points', () => {
    const summary = summarize([], 0)

    expect(summary.listenersAvg).toBe(0)
    expect(summary.listenersMax).toBe(0)
    expect(summary.listenerMinutes).toBe(0)
    expect(summary.sessions).toBe(0)
    expect(summary.airtimeSeconds).toBe(0)
    expect(summary.uniqueListeners).toBe(0)
    expect(summary.totalBuckets).toBe(0)
  })
})

describe('resolveRange', () => {
  const tz = 'America/Santiago'
  const now = new Date('2026-11-17T15:00:00.000Z')

  it('starts 7 días at the beginning of the local day', () => {
    const range = resolveRange(new URLSearchParams({ period: 'week' }), tz, now)

    expect(range.from.toISOString()).toBe('2026-11-11T03:00:00.000Z')
    expect(range.to.toISOString()).toBe(now.toISOString())
    expect(localDayKey(range.from, tz)).toBe('2026-11-11')
    expect(localDayKey(range.to, tz)).toBe('2026-11-17')
    expect(range.prevFrom.toISOString()).toBe('2026-11-04T03:00:00.000Z')
    // El 11 pertenece al período actual; el anterior termina justo antes.
    expect(range.prevTo.toISOString()).toBe('2026-11-11T02:59:59.999Z')
    expect(localDayKey(range.prevTo, tz)).toBe('2026-11-10')
  })

  it('starts 30 días at the beginning of the local day', () => {
    const range = resolveRange(new URLSearchParams({ period: 'month' }), tz, now)

    expect(localDayKey(range.from, tz)).toBe('2026-10-19')
    expect(localDayKey(range.to, tz)).toBe('2026-11-17')
  })

  it('uses 24-hour windows for the day period', () => {
    const range = resolveRange(new URLSearchParams({ period: 'day' }), tz, now)

    expect(range.from.toISOString()).toBe('2026-11-16T15:00:00.000Z')
    expect(range.to.toISOString()).toBe(now.toISOString())
  })

  it('keeps a custom range untouched', () => {
    const range = resolveRange(
      new URLSearchParams({
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-02T00:00:00.000Z',
      }),
      tz,
      now
    )

    expect(range.from.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-02T00:00:00.000Z')
    expect(range.prevFrom.toISOString()).toBe('2026-10-31T00:00:00.000Z')
    expect(range.prevTo.toISOString()).toBe('2026-10-31T23:59:59.999Z')
  })

  it('keeps 7 calendar days across the DST change', () => {
    const dstNow = new Date('2026-09-07T15:00:00.000Z')
    const range = resolveRange(new URLSearchParams({ period: 'week' }), tz, dstNow)

    // El 1 de septiembre sigue en horario de invierno (UTC-4); el 7 ya está en
    // horario de verano (UTC-3). El rango no debe correrse por el cambio.
    expect(range.from.toISOString()).toBe('2026-09-01T04:00:00.000Z')
    expect(localDayKey(range.from, tz)).toBe('2026-09-01')
    expect(localDayKey(range.to, tz)).toBe('2026-09-07')
  })
})

describe('startOfLocalDay', () => {
  it('returns the first instant of the local day', () => {
    expect(startOfLocalDay(new Date('2026-11-17T15:00:00.000Z'), 'America/Santiago').toISOString()).toBe(
      '2026-11-17T03:00:00.000Z'
    )
  })
})
