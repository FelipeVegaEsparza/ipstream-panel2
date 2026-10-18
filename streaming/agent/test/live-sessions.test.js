import test from 'node:test'
import assert from 'node:assert/strict'

// Config del agente: valores mínimos para poder importar los módulos.
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

const {
  createSession,
  endSession,
  getSession,
  getSessionByStream,
  listSessions,
  removeSession,
  touchSession,
} = await import('../lib/live-sessions.js')

function freshPayload(sid = 'session-a', cid = 'client-a', mount = '/dj1') {
  return { sid, cid, slotId: sid, mount, transport: 'whip' }
}

test('crea y consulta una sesión por id y por stream', () => {
  const session = createSession(freshPayload())
  assert.equal(getSession('session-a')?.clientId, 'client-a')
  assert.equal(getSessionByStream('session-a')?.mount, '/dj1')
  assert.equal(listSessions().length, 1)
  removeSession(session.sessionId)
})

test('no permite dos sesiones en el mismo slot', () => {
  const first = createSession(freshPayload('session-b'))
  assert.throws(
    () => createSession(freshPayload('session-c')),
    (err) => err.statusCode === 409
  )
  removeSession(first.sessionId)
})

test('touchSession actualiza el heartbeat', async () => {
  const session = createSession(freshPayload('session-d'))
  const before = session.lastHeartbeat
  await new Promise((resolve) => setTimeout(resolve, 5))
  touchSession('session-d')
  assert.ok(getSession('session-d').lastHeartbeat >= before)
  removeSession('session-d')
})

test('endSession libera la sesión y permite reutilizar el slot', async () => {
  const session = createSession(freshPayload('session-e'))
  await endSession(session)
  assert.equal(getSession('session-e'), null)
  const again = createSession(freshPayload('session-f'))
  assert.equal(again.stream, 'session-f')
  removeSession(again.sessionId)
})

test('endSession es idempotente', async () => {
  await endSession(null)
  await endSession({ sessionId: 'no-existe', bridge: null })
})

const { parseOrphanPids } = await import('../lib/live-bridge.js')

test('parseOrphanPids detecta solo FFmpeg que publican al harbor', () => {
  const output = [
    '  123 ffmpeg -i rtmp://srs/radio/s1 -f mp3 icecast://source:pwd@liquidsoap:22340/dj1',
    '  456 sh -c sleep infinity',
    '  789 ffmpeg -i pipe:0 icecast://source:pwd@liquidsoap:22340/dj2',
  ].join('\n')
  assert.deepEqual(parseOrphanPids(output), [123, 789])
})
