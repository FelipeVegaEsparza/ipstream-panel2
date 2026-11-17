import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ViewerSessionTracker } from '../lib/analytics/sessions.js'

const base = {
  clientId: 'c1',
  streamId: 'v1',
  streamKey: 'tv_abcdef012345',
  ip: '1.1.1.1',
  userAgent: 'Mozilla/5.0',
}

function tracker(overrides = {}) {
  return new ViewerSessionTracker({
    gapSeconds: 300,
    updateIntervalSeconds: 0,
    now: () => 0,
    ...overrides,
  })
}

test('consolida recargas dentro de la ventana en una sola sesión', () => {
  const t = tracker()

  const first = t.ingest({ ...base, startedAt: new Date(0), bytes: 10 })
  const second = t.ingest({ ...base, startedAt: new Date(60_000), bytes: 20 })
  const third = t.ingest({ ...base, startedAt: new Date(120_000), bytes: 30 })

  assert.ok(first.start)
  assert.ok(second.update)
  assert.ok(third.update)
  assert.equal(t.size, 1)
  assert.equal(third.update.signature, first.start.signature)
  assert.equal(third.update.bytes, 60)
  assert.equal(third.update.durationSeconds, 120)
})

test('abre una sesión nueva después de superar la ventana de inactividad', () => {
  const t = tracker()

  const first = t.ingest({ ...base, startedAt: new Date(0) })
  const second = t.ingest({ ...base, startedAt: new Date(400_000) })

  assert.ok(first.start)
  assert.ok(second.start)
  assert.notEqual(first.start.signature, second.start.signature)
  // El tracker conserva solo la sesión vigente por IP+stream; la anterior ya
  // quedó persistida por el colector.
  assert.equal(t.size, 1)
})

test('la firma es determinista al releer el mismo tramo', () => {
  const event = { ...base, startedAt: new Date(10_000) }

  const firstTracker = tracker()
  const secondTracker = tracker()

  const first = firstTracker.ingest(event).start
  const second = secondTracker.ingest(event).start

  assert.equal(first.signature, second.signature)
})

test('separa sesiones por IP y por stream', () => {
  const t = tracker()

  t.ingest({ ...base, startedAt: new Date(0) })
  t.ingest({ ...base, ip: '2.2.2.2', startedAt: new Date(0) })
  t.ingest({ ...base, streamKey: 'tv_ffffffffffff', startedAt: new Date(0) })

  assert.equal(t.size, 3)
})

test('prune descarta sesiones sin actividad reciente', () => {
  const t = tracker({ gapSeconds: 10, now: () => 100_000 })

  t.ingest({ ...base, startedAt: new Date(0) })
  assert.equal(t.size, 1)

  t.prune()
  assert.equal(t.size, 0)
})
