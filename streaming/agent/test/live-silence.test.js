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
process.env.RADIO_SILENCE_COOLDOWN_SECONDS = '30'

const { default: streamRoutes } = await import('../routes/streams.js')
const { pool } = await import('../lib/db.js')
const {
  createSession,
  endSession,
  getRecentEndReason,
  getSession,
  listSessions,
} = await import('../lib/live-sessions.js')

const app = Fastify()
await app.register(streamRoutes)
await app.ready()

const originalQuery = pool.query

afterEach(async () => {
  for (const session of listSessions()) await endSession(session)
  pool.query = originalQuery
})

test('silencio cierra la consola web y deja el motivo para el panel', async () => {
  pool.query = async () => [{}]
  createSession({
    sid: 'silence-live',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/live',
    transport: 'websocket',
  })

  const res = await app.inject({
    method: 'POST',
    url: '/api/streams/client-1/harbor/silence?dj=/live&slot=live',
  })

  assert.equal(res.statusCode, 200)
  assert.equal(res.json().action, 'ended_live')
  assert.equal(getSession('silence-live'), null)
  assert.equal(getRecentEndReason('silence-live'), 'silence')
})

test('el cooldown evita cortes repetidos', async () => {
  pool.query = async () => [{}]
  createSession({
    sid: 'silence-cooldown',
    cid: 'client-cooldown',
    slotId: 'dj-1',
    mount: '/live',
    transport: 'websocket',
  })

  const first = await app.inject({
    method: 'POST',
    url: '/api/streams/client-cooldown/harbor/silence?dj=/live&slot=live',
  })
  const second = await app.inject({
    method: 'POST',
    url: '/api/streams/client-cooldown/harbor/silence?dj=/live&slot=live',
  })

  assert.equal(first.json().action, 'ended_live')
  assert.equal(second.json().action, 'cooldown')
})
