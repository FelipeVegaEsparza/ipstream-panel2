import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RETENTION_PLAN,
  RAW_RETENTION_DAYS,
  ROLLUP_RETENTION_DAYS,
  retentionCutoff,
} from '../lib/retention-plan.js'

test('plan de retención por capas', () => {
  const byName = Object.fromEntries(RETENTION_PLAN.map((t) => [t.name, t.days]))
  assert.equal(byName['listener_samples'], RAW_RETENTION_DAYS)
  assert.equal(byName['viewer_samples'], RAW_RETENTION_DAYS)
  assert.equal(byName['listener_sessions'], RAW_RETENTION_DAYS)
  assert.equal(byName['viewer_sessions'], RAW_RETENTION_DAYS)
  assert.equal(byName['metrics_hourly'], ROLLUP_RETENTION_DAYS)
  assert.equal(byName['metrics_daily'], ROLLUP_RETENTION_DAYS)
})

test('todas las tablas del plan tienen columna de fecha y ventana positiva', () => {
  for (const t of RETENTION_PLAN) {
    assert.ok(t.dateColumn)
    assert.ok(t.days > 0)
  }
})

test('retentionCutoff resta días al instante dado', () => {
  const now = new Date('2026-02-01T00:00:00Z')
  assert.equal(retentionCutoff(30, now).toISOString(), '2026-01-02T00:00:00.000Z')
})
