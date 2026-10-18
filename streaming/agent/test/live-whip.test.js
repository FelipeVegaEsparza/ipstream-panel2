import test, { after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import Fastify from 'fastify'

// Config mínima del agente.
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
process.env.LIQUIDSOAP_HOST = 'ipstream-liquidsoap'
process.env.LIVE_SESSION_SECRET = 'test-live-secret'
process.env.LIVE_BRIDGE_CODEC = 'mp3'
process.env.LIVE_AUDIO_BITRATE = '192'

const { default: liveRoutes } = await import('../routes/live.js')
const { endSession, listSessions } = await import('../lib/live-sessions.js')
const { ffmpegArgs } = await import('../lib/live-bridge.js')

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function makeToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sid: 's1',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
    iat: now,
    exp: now + 120,
    ...overrides,
  }
  const encoded = b64url(JSON.stringify(payload))
  const signature = b64url(crypto.createHmac('sha256', 'test-live-secret').update(encoded).digest())
  return `${encoded}.${signature}`
}

const app = Fastify()
app.addContentTypeParser('application/sdp', { parseAs: 'string' }, (_req, body, done) => {
  done(null, body)
})
await app.register(liveRoutes)
await app.ready()

const originalFetch = global.fetch
let fetchCalls = []

global.fetch = async (url, init) => {
  fetchCalls.push({ url: String(url), init })
  return new Response('answer-sdp', {
    status: init?.method === 'DELETE' ? 200 : 201,
    headers: {
      'Content-Type': 'application/sdp',
      'Location': 'http://srs:8080/rtc/v1/whip/?app=radio&stream=s1',
    },
  })
}

afterEach(async () => {
  for (const session of listSessions()) {
    await endSession(session)
  }
  fetchCalls = []
})

after(async () => {
  global.fetch = originalFetch
  await app.close()
})

test('rechaza un POST sin token', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/rtc/v1/whip?app=radio&stream=s1',
    headers: { 'content-type': 'application/sdp' },
    payload: 'offer',
  })
  assert.equal(res.statusCode, 401)
  assert.equal(fetchCalls.length, 0)
})

test('acepta un WHIP válido y reescribe Location', async () => {
  const token = makeToken()
  const res = await app.inject({
    method: 'POST',
    url: '/rtc/v1/whip?app=radio&stream=s1',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/sdp',
    },
    payload: 'offer-sdp',
  })

  assert.equal(res.statusCode, 201)
  assert.equal(res.headers.location, '/rtc/v1/whip/?app=radio&stream=s1')
  assert.equal(fetchCalls.length, 1)
  assert.equal(fetchCalls[0].url, 'http://srs:8080/rtc/v1/whip/?app=radio&stream=s1')
  assert.equal(fetchCalls[0].init.method, 'POST')
  assert.equal(fetchCalls[0].init.redirect, 'manual')
  assert.equal(fetchCalls[0].init.body, 'offer-sdp')
})

test('rechaza dos sesiones en el mismo slot', async () => {
  const first = await app.inject({
    method: 'POST',
    url: '/rtc/v1/whip?app=radio&stream=s1',
    headers: { authorization: `Bearer ${makeToken()}`, 'content-type': 'application/sdp' },
    payload: 'offer',
  })
  assert.equal(first.statusCode, 201)

  const second = await app.inject({
    method: 'POST',
    url: '/rtc/v1/whip?app=radio&stream=s2',
    headers: { authorization: `Bearer ${makeToken({ sid: 's2' })}`, 'content-type': 'application/sdp' },
    payload: 'offer',
  })
  assert.equal(second.statusCode, 409)
  assert.equal(second.json().error, 'slot_busy')
})

test('DELETE libera la sesión', async () => {
  const token = makeToken()
  await app.inject({
    method: 'POST',
    url: '/rtc/v1/whip?app=radio&stream=s1',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/sdp' },
    payload: 'offer',
  })
  const res = await app.inject({
    method: 'DELETE',
    url: '/rtc/v1/whip?app=radio&stream=s1',
    headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(res.statusCode, 200)
  assert.equal(listSessions().length, 0)
})

test('ffmpegArgs arma el puente WHIP hacia el harbor', () => {
  const args = ffmpegArgs({ stream: 's1', mount: '/dj1' }, 'whip', 22340, 'p@ss')
  assert.ok(args.includes('rtmp://srs:1935/radio/s1'))
  assert.ok(args.includes('libmp3lame'))
  assert.ok(args.includes('192k'))
  assert.ok(args.includes('icecast://source:p%40ss@ipstream-liquidsoap:22340/dj1'))
})

test('ffmpegArgs usa stdin en WebSocket', () => {
  const args = ffmpegArgs({ stream: 's1', mount: '/dj1' }, 'websocket', 22340, 'p@ss')
  assert.equal(args[1], '-i')
  assert.ok(args.includes('pipe:0'))
  assert.ok(!args.includes('rtmp://srs:1935/radio/s1'))
})
