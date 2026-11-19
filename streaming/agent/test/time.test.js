import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  getLocalTimeInZone,
  getNextSlots,
  isTimeInSlot,
  isTimeInSlotDays,
  slotDays,
} from '../lib/time.js'

const TZ = 'UTC'
const at = (iso) => new Date(iso)

test('slotDays parsea CSV y cae al dayOfWeek legado', () => {
  assert.deepEqual(slotDays({ dayOfWeek: 3, daysOfWeek: '1,2,3' }), [1, 2, 3])
  assert.deepEqual(slotDays({ dayOfWeek: 3, daysOfWeek: null }), [3])
  assert.deepEqual(slotDays({ dayOfWeek: 0, daysOfWeek: '' }), [0])
})

test('franja normal del mismo día', () => {
  assert.equal(isTimeInSlot(at('2026-11-18T18:00:00Z'), 3, '17:35', '19:00', TZ), true)
  assert.equal(isTimeInSlot(at('2026-11-18T20:00:00Z'), 3, '17:35', '19:00', TZ), false)
  assert.equal(isTimeInSlot(at('2026-11-19T18:00:00Z'), 3, '17:35', '19:00', TZ), false)
})

test('franja que cruza medianoche incluye la madrugada del día siguiente', () => {
  assert.equal(isTimeInSlot(at('2026-11-18T18:00:00Z'), 3, '17:35', '09:00', TZ), true)
  assert.equal(isTimeInSlot(at('2026-11-19T08:00:00Z'), 3, '17:35', '09:00', TZ), true)
  assert.equal(isTimeInSlot(at('2026-11-19T10:00:00Z'), 3, '17:35', '09:00', TZ), false)
  assert.equal(isTimeInSlot(at('2026-11-20T08:00:00Z'), 3, '17:35', '09:00', TZ), false)
})

test('multi-día con cruce de medianoche', () => {
  const days = [1, 2, 3, 4, 5]
  assert.equal(isTimeInSlotDays(at('2026-11-17T08:00:00Z'), days, '17:35', '09:00', TZ), true)
  assert.equal(isTimeInSlotDays(at('2026-11-17T20:00:00Z'), days, '17:35', '09:00', TZ), true)
  assert.equal(isTimeInSlotDays(at('2026-11-21T08:00:00Z'), days, '17:35', '09:00', TZ), true)
  assert.equal(isTimeInSlotDays(at('2026-11-22T08:00:00Z'), days, '17:35', '09:00', TZ), false)
  assert.equal(isTimeInSlotDays(at('2026-11-16T08:00:00Z'), days, '17:35', '09:00', TZ), false)
})

test('todos los días no deja huecos de madrugada', () => {
  const days = [0, 1, 2, 3, 4, 5, 6]
  assert.equal(isTimeInSlotDays(at('2026-11-22T08:00:00Z'), days, '17:35', '09:00', TZ), true)
  assert.equal(isTimeInSlotDays(at('2026-11-22T10:00:00Z'), days, '17:35', '09:00', TZ), false)
})

test('getNextSlots elige el próximo inicio entre varios días', () => {
  const slots = [{ dayOfWeek: 1, daysOfWeek: '1,5', startTime: '17:00', endTime: '18:00' }]
  // Miércoles 12:00 → viernes 17:00.
  const next = getNextSlots(slots, at('2026-11-18T12:00:00Z'), TZ, 1)
  assert.equal(next.length, 1)
  assert.equal(getLocalTimeInZone(at('2026-11-18T12:00:00Z'), TZ).dayOfWeek, 3)
  assert.equal(next[0].daysOfWeek, '1,5')
})

test('getNextSlots no muta las franjas', () => {
  const slots = [{ dayOfWeek: 1, daysOfWeek: '1,2', startTime: '08:00', endTime: '09:00' }]
  const snapshot = JSON.stringify(slots)
  getNextSlots(slots, at('2026-11-18T12:00:00Z'), TZ, 3)
  assert.equal(JSON.stringify(slots), snapshot)
})
