import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  localDayKey,
  timeZoneOffsetMinutes,
  startOfLocalDayUtc,
  floorToHourUtc,
} from '../lib/analytics/time-buckets.js'

const TZ = 'America/Santiago'

test('localDayKey usa el día local, no el UTC', () => {
  assert.equal(localDayKey(new Date('2026-01-15T02:00:00Z'), TZ), '2026-01-14')
  assert.equal(localDayKey(new Date('2026-01-15T04:00:00Z'), TZ), '2026-01-15')
})

test('timeZoneOffsetMinutes refleja verano/invierno de Santiago', () => {
  assert.equal(timeZoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), TZ), -180)
  assert.equal(timeZoneOffsetMinutes(new Date('2026-06-15T12:00:00Z'), TZ), -240)
})

test('el cambio de horario mueve el offset', () => {
  const before = timeZoneOffsetMinutes(new Date('2026-09-05T12:00:00Z'), TZ)
  const after = timeZoneOffsetMinutes(new Date('2026-09-06T12:00:00Z'), TZ)
  assert.equal(before, -240)
  assert.equal(after, -180)
})

test('startOfLocalDayUtc da la medianoche local en UTC', () => {
  assert.equal(
    startOfLocalDayUtc(new Date('2026-01-15T15:00:00Z'), TZ).toISOString(),
    '2026-01-15T03:00:00.000Z'
  )
})

test('floorToHourUtc', () => {
  assert.equal(floorToHourUtc(new Date('2026-01-15T15:37:12Z')).toISOString(), '2026-01-15T15:00:00.000Z')
})
