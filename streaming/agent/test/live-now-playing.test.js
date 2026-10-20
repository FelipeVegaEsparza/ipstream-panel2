import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'

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

const { default: liveRoutes } = await import('../routes/live.js')
const { pool } = await import('../lib/db.js')
const { createSession, endSession, listSessions } = await import('../lib/live-sessions.js')

const app = Fastify()
await app.register(liveRoutes)
await app.ready()

const originalFetch = global.fetch
const originalQuery = pool.query
let queries = []
let fetches = []

global.fetch = async (url) => {
  fetches.push(String(url))
  return new Response('ok', { status: 200 })
}

afterEach(async () => {
  for (const session of listSessions()) await endSession(session)
  pool.query = originalQuery
  global.fetch = originalFetch
  queries = []
  fetches = []
})

test('now-playing actualiza la DB y la metadata de Icecast', async () => {
  createSession({
    sid: 's1',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
  })
  pool.query = async (sql, params) => {
    queries.push({ sql: String(sql), params })
    if (String(sql).includes('SELECT icecastMount')) {
      return [[{ icecastMount: 'radio_test' }]]
    }
    return [{}]
  }

  const res = await app.inject({
    method: 'POST',
    url: '/api/live/session/now-playing',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({
      sessionId: 's1',
      clientId: 'client-1',
      title: 'Tema',
      artist: 'Artista',
    }),
  })

  assert.equal(res.statusCode, 200)
  const update = queries.find((query) => query.sql.includes('UPDATE radio_streams'))
  assert.ok(update)
  assert.deepEqual(update.params, ['Tema', 'Artista', null, 'client-1'])
  assert.ok(fetches.some((url) => url.includes('radio_test') && url.includes('updatemetadata') && url.includes('Artista%20-%20Tema')))
})

test('now-playing rechaza otro cliente', async () => {
  createSession({
    sid: 's1',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
  })

  const res = await app.inject({
    method: 'POST',
    url: '/api/live/session/now-playing',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ sessionId: 's1', clientId: 'otro', title: 'X' }),
  })

  assert.equal(res.statusCode, 403)
  assert.equal(queries.length, 0)
})

test('heartbeat mantiene la sesión y end la cierra', async () => {
  createSession({
    sid: 's1',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
  })

  const hb = await app.inject({
    method: 'POST',
    url: '/api/live/session/heartbeat',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ sessionId: 's1', clientId: 'client-1' }),
  })
  assert.equal(hb.statusCode, 200)
  assert.equal(hb.json().ok, true)

  const end = await app.inject({
    method: 'POST',
    url: '/api/live/session/end',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ sessionId: 's1', clientId: 'client-1' }),
  })
  assert.equal(end.statusCode, 200)
  assert.equal(listSessions().length, 0)
})

test('heartbeat rechaza otro cliente', async () => {
  createSession({
    sid: 's1',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
  })

  const res = await app.inject({
    method: 'POST',
    url: '/api/live/session/heartbeat',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ sessionId: 's1', clientId: 'otro' }),
  })
  assert.equal(res.statusCode, 403)
})
