import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  announcementTarget,
  estimateRemaining,
  parseRemaining,
} from '../lib/ai-announcement-timing.js'

test('parseRemaining descarta inf y valores fuera de rango', () => {
  assert.equal(parseRemaining('12.5'), 12.5)
  assert.equal(parseRemaining('0'), 0)
  assert.equal(parseRemaining('inf'), null)
  assert.equal(parseRemaining('Infinity'), null)
  assert.equal(parseRemaining(''), null)
  assert.equal(parseRemaining('-3'), null)
  assert.equal(parseRemaining('999999'), null)
})

test('estimateRemaining usa duración e inicio del tema', () => {
  const now = Date.parse('2026-10-22T12:03:00Z')
  const started = Date.parse('2026-10-22T12:00:00Z')
  assert.equal(estimateRemaining(180, started, now), null)
  assert.equal(estimateRemaining(240, started, now), 60)
  assert.equal(estimateRemaining(120, started, now), null)
  assert.equal(estimateRemaining(0, started, now), null)
  assert.equal(estimateRemaining(180, Number.NaN, now), null)
})

test('announcementTarget apunta al corte, no al momento de generar', () => {
  const now = Date.parse('2026-10-22T12:59:50Z')
  const target = announcementTarget(30, now)
  assert.equal(target.toISOString(), '2026-10-22T13:00:20.000Z')
})
