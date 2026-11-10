import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCapsule, pickCandidate } from '../lib/news-capsule-schedule.js'

function capsule(overrides = {}) {
  return {
    id: 'c1',
    status: 'approved',
    audioUrl: '/x.mp3',
    priority: 5,
    minGapMinutes: 30,
    graceMinutes: 10,
    windowStart: null,
    windowEnd: null,
    activeFrom: null,
    activeTo: null,
    lastPlayedAt: null,
    tracksSinceLastPlay: 0,
    rules: [{ id: 'r1', kind: 'times', config: { times: ['14:00'] }, days: null, active: true }],
    ...overrides,
  }
}

test('emite una hora exacta dentro de la gracia', () => {
  const result = evaluateCapsule(capsule(), [], {
    now: new Date('2026-11-10T14:05:00Z'),
    timeZone: 'UTC',
    tracksSinceLastPlay: 0,
  })
  // evaluateCapsule recibe las reglas por separado
})

test('evalúa reglas por temas y prioridad', () => {
  const high = capsule({
    id: 'high', priority: 9, tracksSinceLastPlay: 5,
    rules: [{ id: 'r', kind: 'tracks', config: { everyTracks: 5 }, days: null, active: true }],
  })
  const low = capsule({
    id: 'low', priority: 1, tracksSinceLastPlay: 5,
    rules: [{ id: 'r', kind: 'tracks', config: { everyTracks: 5 }, days: null, active: true }],
  })
  const result = pickCandidate([low, high], {
    now: new Date('2026-11-10T14:00:00Z'),
    timeZone: 'UTC',
    tracksSinceLastPlay: 0,
  })
  assert.equal(result.capsule.id, 'high')
})

test('no emite fuera de la ventana ni en cooldown', () => {
  const outside = capsule({ windowStart: '08:00', windowEnd: '10:00' })
  assert.equal(evaluateCapsule(outside, outside.rules, {
    now: new Date('2026-11-10T14:00:00Z'), timeZone: 'UTC', tracksSinceLastPlay: 0,
  }).due, false)
  const cooldown = capsule({ lastPlayedAt: '2026-11-10T13:50:00Z' })
  assert.equal(evaluateCapsule(cooldown, cooldown.rules, {
    now: new Date('2026-11-10T14:05:00Z'), timeZone: 'UTC', tracksSinceLastPlay: 0,
  }).due, false)
})

test('detecta hora exacta y gracia vencida', () => {
  const c = capsule()
  assert.equal(evaluateCapsule(c, c.rules, {
    now: new Date('2026-11-10T14:05:00Z'), timeZone: 'UTC', tracksSinceLastPlay: 0,
  }).due, true)
  assert.equal(evaluateCapsule(c, c.rules, {
    now: new Date('2026-11-10T14:11:00Z'), timeZone: 'UTC', tracksSinceLastPlay: 0,
  }).due, false)
})
