import test, { afterEach } from 'node:test'
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

const { pool } = await import('../lib/db.js')
const { startSession } = await import('../lib/dj-sessions.js')

const originalQuery = pool.query
let calls = []

afterEach(() => {
  pool.query = originalQuery
  calls = []
})

test('startSession guarda el origen de la sesión', async () => {
  pool.query = async (sql, params) => {
    calls.push({ sql: String(sql), params })
    if (String(sql).includes('SELECT id FROM dj_sessions')) return [[]]
    return [{}]
  }

  const id = await startSession({
    clientId: 'client-1',
    radioStreamId: 'radio-1',
    djId: 'dj-1',
    mount: '/dj1',
    role: 'host',
    ipAddress: '127.0.0.1',
    origin: 'webrtc',
  })

  assert.ok(id)
  const insert = calls.find((call) => call.sql.includes('INSERT INTO dj_sessions'))
  assert.ok(insert)
  assert.match(insert.sql, /origin/)
  assert.ok(insert.params.includes('webrtc'))
})

test('startSession usa harbor por defecto', async () => {
  pool.query = async (sql, params) => {
    calls.push({ sql: String(sql), params })
    if (String(sql).includes('SELECT id FROM dj_sessions')) return [[]]
    return [{}]
  }

  await startSession({
    clientId: 'client-1',
    radioStreamId: 'radio-1',
    djId: 'dj-1',
    mount: '/dj1',
    role: 'host',
    ipAddress: null,
  })

  const insert = calls.find((call) => call.sql.includes('INSERT INTO dj_sessions'))
  assert.ok(insert.params.includes('harbor'))
})
