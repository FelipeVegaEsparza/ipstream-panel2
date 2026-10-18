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
process.env.LIVE_SESSION_STALE_MS = '5'

const { createSession, endSession, getSession, listSessions, sweepStaleSessions } = await import('../lib/live-sessions.js')

afterEach(async () => {
  for (const session of listSessions()) await endSession(session)
})

test('sweepStaleSessions cierra sesiones sin heartbeat', async () => {
  createSession({
    sid: 'stale',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
  })

  await new Promise((resolve) => setTimeout(resolve, 15))
  await sweepStaleSessions((session) => endSession(session))

  assert.equal(getSession('stale'), null)
  assert.equal(listSessions().length, 0)
})

test('sweepStaleSessions conserva una sesión recién creada', async () => {
  createSession({
    sid: 'fresh',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
  })

  await sweepStaleSessions((session) => endSession(session))
  assert.ok(getSession('fresh'))
})
