import { test } from 'node:test'
import assert from 'node:assert/strict'

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
process.env.LIVE_SESSION_SECRET = 'test-live-secret'

const { pushCapsule, buildCapsulesQuery } = await import('../lib/news-capsule-scheduler.js')

test('empuja la cápsula a la cola y registra la ejecución', async () => {
  const calls = []
  const db = { query: async (...args) => { calls.push(args); return [{}] } }
  const telnet = async (port, command) => { calls.push([port, command]); return '42' }
  const result = await pushCapsule(
    'client-1',
    { liquidsoapTelnetPort: 1234 },
    { id: 'capsule-1', title: 'Noticia' },
    new Date('2026-11-10T14:00:00Z'),
    { db, telnet, exists: () => true }
  )
  assert.equal(result, true)
  const command = calls.find((entry) => typeof entry[1] === 'string' && entry[1].startsWith('news-queue.push'))
  assert.ok(command)
  assert.match(command[1], /^news-queue\.push file:\/\//)
  assert.doesNotMatch(command[1], /request\.create|"/)
  assert.match(command[1], /capsule-1\.mp3/)
  assert.ok(calls.some((entry) => typeof entry[0] === 'string' && entry[0].includes('INSERT INTO news_capsule_runs')))
})

test('no empuja si falta el audio en el agente', async () => {
  const calls = []
  const db = { query: async (...args) => { calls.push(args); return [{}] } }
  const telnet = async (...args) => { calls.push(args); return '42' }
  const result = await pushCapsule(
    'client-1',
    { liquidsoapTelnetPort: 1234 },
    { id: 'capsule-2' },
    new Date(),
    { db, telnet, exists: () => false }
  )
  assert.equal(result, false)
  assert.equal(telnet.mock?.calls?.length || 0, 0)
})

test('la consulta incluye status y filtra por el servidor local', () => {
  const local = buildCapsulesQuery('srv-1')
  assert.match(local.sql, /nc\.status/)
  assert.match(local.sql, /rs\.serverId = \?/)
  assert.deepEqual(local.params, ['srv-1'])
  const legacy = buildCapsulesQuery(null)
  assert.match(legacy.sql, /rs\.serverId IS NULL/)
  assert.deepEqual(legacy.params, [])
})

test('el INSERT de ejecuciones recibe un parámetro por cada placeholder', async () => {
  let insertArgs = null
  const db = {
    query: async (sql, params) => {
      if (sql.includes('INSERT INTO news_capsule_runs')) insertArgs = { sql, params }
      return [{}]
    },
  }
  const scheduledFor = new Date('2026-11-10T21:10:00Z')
  await pushCapsule(
    'client-1',
    { liquidsoapTelnetPort: 1234 },
    { id: 'capsule-1' },
    scheduledFor,
    { db, telnet: async () => '42', exists: () => true }
  )
  assert.ok(insertArgs)
  const placeholders = (insertArgs.sql.split('?').length - 1)
  assert.equal(insertArgs.params.length, placeholders)
  assert.equal(insertArgs.params[3].toISOString(), scheduledFor.toISOString())
  assert.ok(insertArgs.params[4] instanceof Date)
})

test('falla si Liquidsoap rechaza la orden de cola', async () => {
  const db = { query: async () => [{}] }
  await assert.rejects(
    pushCapsule(
      'client-1',
      { liquidsoapTelnetPort: 1234 },
      { id: 'capsule-3' },
      new Date(),
      { db, telnet: async () => 'ERROR: unknown command', exists: () => true }
    ),
    /rechazó/
  )
})
