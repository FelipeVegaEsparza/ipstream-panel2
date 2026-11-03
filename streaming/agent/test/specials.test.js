import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

process.env.STREAMING_AGENT_TOKEN = 'test-agent-token'
process.env.HARBOR_CALLBACK_SECRET = 'test-harbor-secret'
process.env.DB_USER = 'test'
process.env.DB_PASSWORD = 'test'
process.env.DB_DATABASE = 'test'
process.env.ICE_ADMIN_USER = 'admin'
process.env.ICE_ADMIN_PASSWORD = 'test'
process.env.ICE_SOURCE_PASSWORD = 'test'
process.env.ICE_RELAY_PASSWORD = 'test'
process.env.ICE_HOSTNAME = 'localhost'
process.env.HARBOR_PUBLIC_HOSTNAME = 'localhost'

const library = await mkdtemp(join(tmpdir(), 'specials-'))
process.env.RADIO_LIBRARY_PATH = library

const { todayInTimezone, isSpecialInWindow, insertionPositions } = await import(
  '../lib/special-schedule.js'
)
const { saveSpecialAudio, specialAudioExists, clearSpecialAudio } = await import('../lib/files.js')

test.after(async () => {
  await rm(library, { recursive: true, force: true })
})

test('calcula el día en la zona horaria del cliente', () => {
  const instant = new Date('2026-11-04T02:30:00Z')
  assert.equal(todayInTimezone('UTC', instant), '2026-11-04')
  assert.equal(todayInTimezone('America/Santiago', instant), '2026-11-03')
})

test('respeta la ventana de fechas del especial', () => {
  const special = { startDate: '2026-11-01', endDate: '2026-11-30' }
  assert.equal(isSpecialInWindow(special, '2026-10-31'), false)
  assert.equal(isSpecialInWindow(special, '2026-11-01'), true)
  assert.equal(isSpecialInWindow(special, '2026-11-30'), true)
  assert.equal(isSpecialInWindow(special, '2026-12-01'), false)
  assert.equal(isSpecialInWindow({ startDate: null, endDate: null }, '2026-01-01'), true)
})

test('calcula las posiciones de inserción sin contar los temas del especial', () => {
  assert.deepEqual(insertionPositions(5, 17), [5, 10, 15])
  assert.deepEqual(insertionPositions(10, 7), [])
  assert.deepEqual(insertionPositions(0, 20), [])
})

test('guarda y limpia el audio de un especial', async () => {
  await saveSpecialAudio('client-a', 'sp-1', 'intro', Buffer.from('intro'))
  await saveSpecialAudio('client-a', 'sp-1', 'closing', Buffer.from('closing'))
  assert.equal(specialAudioExists('client-a', 'sp-1', 'intro'), true)
  assert.equal(specialAudioExists('client-a', 'sp-1', 'closing'), true)

  await clearSpecialAudio('client-a', 'sp-1')
  assert.equal(specialAudioExists('client-a', 'sp-1', 'intro'), false)
  assert.equal(specialAudioExists('client-a', 'sp-1', 'closing'), false)
})
