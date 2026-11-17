import { describe, expect, it } from 'vitest'
import {
  formatBucket,
  formatDelta,
  formatMetric,
  formatMinutes,
  formatUptime,
} from './analytics-format'

describe('formatMetric', () => {
  it('formats finite numbers', () => {
    expect(formatMetric(0)).toBe('0')
    expect(formatMetric(0.1)).toBe('0.1')
    expect(formatMetric(-3)).toBe('-3')
  })

  it('falls back for missing or non-finite values', () => {
    expect(formatMetric(undefined)).toBe('—')
    expect(formatMetric(null)).toBe('—')
    expect(formatMetric(Number.NaN)).toBe('—')
    expect(formatMetric(Number.POSITIVE_INFINITY, 'n/d')).toBe('n/d')
  })
})

describe('formatBucket', () => {
  it('does not shift a local day key to the previous day', () => {
    const label = formatBucket('2026-11-17', 'day', 'es', 'America/Santiago')
    expect(label).toContain('17')
    expect(label).not.toContain('16')
  })

  it('formats hourly buckets in the client timezone', () => {
    const iso = '2026-11-17T14:00:00.000Z'
    const utc = new Date(iso).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
    const santiago = new Date(iso).toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Santiago',
    })

    expect(formatBucket(iso, 'hour', 'es', 'UTC')).toBe(utc)
    expect(formatBucket(iso, 'hour', 'es', 'America/Santiago')).toBe(santiago)
    expect(utc).not.toBe(santiago)
  })

  it('returns the raw bucket when it is not a valid date', () => {
    expect(formatBucket('not-a-date', 'hour', 'es', 'UTC')).toBe('not-a-date')
  })
})

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(61)).toBe('1h 1m')
    expect(formatMinutes(1156)).toBe('19h 16m')
  })

  it('falls back for missing values', () => {
    expect(formatMinutes(undefined)).toBe('—')
    expect(formatMinutes(Number.NaN)).toBe('—')
  })
})

describe('formatUptime', () => {
  it('computes the percentage over the range', () => {
    expect(formatUptime(3600, '2026-11-17T00:00:00.000Z', '2026-11-17T02:00:00.000Z')).toBe('50%')
  })

  it('caps at 100% and falls back on invalid ranges', () => {
    expect(formatUptime(99999, '2026-11-17T00:00:00.000Z', '2026-11-17T01:00:00.000Z')).toBe('100%')
    expect(formatUptime(10, '2026-11-17T01:00:00.000Z', '2026-11-17T00:00:00.000Z')).toBe('—')
    expect(formatUptime(undefined, '2026-11-17T00:00:00.000Z', '2026-11-17T01:00:00.000Z')).toBe('—')
  })
})

describe('formatDelta', () => {
  it('computes the variation against the previous period', () => {
    expect(formatDelta(10, 8)).toBe(25)
    expect(formatDelta(8, 10)).toBe(-20)
  })

  it('returns null when there is no comparable previous value', () => {
    expect(formatDelta(10, 0)).toBeNull()
    expect(formatDelta(undefined, 10)).toBeNull()
  })
})
