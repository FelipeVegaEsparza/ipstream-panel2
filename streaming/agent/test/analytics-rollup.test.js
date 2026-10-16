import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeHourlyRows, computeDailyRows } from '../lib/analytics/rollup.js'

test('computeHourlyRows agrega muestras y sesiones', () => {
  const samples = [
    { clientId: 'c1', value: 10, online: true },
    { clientId: 'c1', value: 20, online: true },
    { clientId: 'c1', value: 0, online: false },
  ]
  const sessions = [
    { clientId: 'c1', ip: '1.1.1.1' },
    { clientId: 'c1', ip: '1.1.1.1' },
    { clientId: 'c1', ip: '2.2.2.2' },
  ]
  const rows = computeHourlyRows({
    samples, sessions, intervalSeconds: 60,
    bucketStartUtc: new Date('2026-01-15T15:00:00Z'),
  })
  assert.equal(rows.length, 1)
  const r = rows[0]
  assert.equal(r.listenersAvg, 10)
  assert.equal(r.listenersMax, 20)
  assert.equal(r.airtimeSeconds, 120)
  assert.equal(r.listenerMinutes, 30)
  assert.equal(r.sessions, 3)
  assert.equal(r.uniqueListeners, 2)
})

test('computeHourlyRows separa por cliente', () => {
  const rows = computeHourlyRows({
    samples: [
      { clientId: 'c1', value: 5, online: true },
      { clientId: 'c2', value: 7, online: true },
    ],
    sessions: [],
    intervalSeconds: 60,
    bucketStartUtc: new Date('2026-01-15T15:00:00Z'),
  })
  assert.equal(rows.length, 2)
})

test('computeDailyRows no parte un día local en dos buckets UTC', () => {
  // 03:30Z y 02:00Z del día siguiente => en Santiago (UTC-3) son 00:30 y 23:00 del mismo día local
  const samples = [
    { clientId: 'c1', value: 4, online: true, timestamp: new Date('2026-01-15T03:30:00Z') },
    { clientId: 'c1', value: 6, online: true, timestamp: new Date('2026-01-16T02:00:00Z') },
  ]
  const rows = computeDailyRows({
    samples, sessions: [], intervalSeconds: 60, tz: 'America/Santiago',
  })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].dayLocal, '2026-01-15')
  assert.equal(rows[0].listenersMax, 6)
})

test('cambiar la zona horaria re-alinea los buckets diarios', () => {
  const samples = [
    { clientId: 'c1', value: 3, online: true, timestamp: new Date('2026-01-15T02:00:00Z') },
  ]
  const santiago = computeDailyRows({ samples, sessions: [], intervalSeconds: 60, tz: 'America/Santiago' })
  const utc = computeDailyRows({ samples, sessions: [], intervalSeconds: 60, tz: 'UTC' })
  assert.equal(santiago[0].dayLocal, '2026-01-14')
  assert.equal(utc[0].dayLocal, '2026-01-15')
})

test('computeDailyRows separa días locales distintos', () => {
  const samples = [
    { clientId: 'c1', value: 1, online: true, timestamp: new Date('2026-01-15T02:00:00Z') },
    { clientId: 'c1', value: 2, online: true, timestamp: new Date('2026-01-15T04:00:00Z') },
  ]
  const rows = computeDailyRows({
    samples, sessions: [], intervalSeconds: 60, tz: 'America/Santiago',
  })
  assert.equal(rows.length, 2)
})
