import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

process.env.LIVE_SESSION_SECRET = 'test-live-secret'

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function makeToken(payload, secret = 'test-live-secret') {
  const encoded = b64url(JSON.stringify(payload))
  const signature = b64url(crypto.createHmac('sha256', secret).update(encoded).digest())
  return `${encoded}.${signature}`
}

const { verifyLiveToken, bearerToken } = await import('../lib/live-token.js')

function payload(overrides = {}) {
  const now = Math.floor(Date.now() / 1000)
  return {
    sid: 'session-1',
    cid: 'client-1',
    slotId: 'dj-1',
    mount: '/dj1',
    transport: 'whip',
    iat: now,
    exp: now + 120,
    ...overrides,
  }
}

test('verifyLiveToken acepta un token válido', () => {
  const result = verifyLiveToken(makeToken(payload()))
  assert.equal(result?.sid, 'session-1')
  assert.equal(result?.cid, 'client-1')
  assert.equal(result?.transport, 'whip')
})

test('verifyLiveToken rechaza un token expirado', () => {
  const now = Math.floor(Date.now() / 1000)
  assert.equal(verifyLiveToken(makeToken(payload({ exp: now - 1 }))), null)
})

test('verifyLiveToken rechaza una firma alterada', () => {
  const token = makeToken(payload())
  assert.equal(verifyLiveToken(`${token.slice(0, -2)}xx`), null)
})

test('verifyLiveToken rechaza otro secreto', () => {
  assert.equal(verifyLiveToken(makeToken(payload(), 'otro-secreto')), null)
})

test('verifyLiveToken rechaza transporte desconocido', () => {
  assert.equal(verifyLiveToken(makeToken(payload({ transport: 'srt' }))), null)
})

test('bearerToken extrae el token del header', () => {
  assert.equal(bearerToken({ headers: { authorization: 'Bearer abc' } }), 'abc')
  assert.equal(bearerToken({ headers: { authorization: 'Basic abc' } }), null)
  assert.equal(bearerToken({ headers: {} }), null)
})
