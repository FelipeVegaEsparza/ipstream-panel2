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

const { default: libraryRoutes } = await import('../routes/library.js')
const { pool } = await import('../lib/db.js')

const app = Fastify()
await app.register(libraryRoutes)
await app.ready()

const originalQuery = pool.query
let queries = []
let selectRows = []
let failUpdateForId = null

function installPoolMock() {
  queries = []
  pool.query = async (sql, params) => {
    const text = String(sql)
    if (text.includes('SELECT id, title, artist FROM tracks')) {
      queries.push({ sql: text, params })
      return [selectRows]
    }
    if (text.includes('UPDATE tracks SET title')) {
      if (failUpdateForId && params[2] === failUpdateForId) throw new Error('update boom')
      queries.push({ sql: text, params })
      return [{}]
    }
    queries.push({ sql: text, params })
    return [{}]
  }
}

afterEach(() => {
  pool.query = originalQuery
  selectRows = []
  failUpdateForId = null
})

function normalizeRequest(payload) {
  if (payload === undefined) {
    return app.inject({ method: 'POST', url: '/api/streams/client-1/library/normalize' })
  }
  return app.inject({
    method: 'POST',
    url: '/api/streams/client-1/library/normalize',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  })
}

test('normaliza solo la selección explícita', async () => {
  installPoolMock()
  selectRows = [
    { id: 'trk-1', title: 'Tema (Official Video)', artist: 'Artista' },
    { id: 'trk-2', title: 'Como Ti', artist: 'Camilo' },
  ]

  const res = await normalizeRequest({ trackIds: ['trk-1', 'trk-2'] })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { ok: true, scanned: 2, normalized: 1, unchanged: 1, failed: 0 })

  const select = queries.find((q) => q.sql.includes('SELECT id, title, artist FROM tracks'))
  assert.match(select.sql, /id IN \(\?, \?\)/)
  assert.deepEqual(select.params, ['client-1', 'trk-1', 'trk-2'])

  const updates = queries.filter((q) => q.sql.includes('UPDATE tracks SET title'))
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].params, ['Tema', 'Artista', 'trk-1', 'client-1'])
})

test('sin trackIds normaliza toda la biblioteca del cliente', async () => {
  installPoolMock()
  selectRows = [{ id: 'trk-1', title: '01 - Tema', artist: 'Artista (Remix)' }]

  const res = await normalizeRequest()
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { ok: true, scanned: 1, normalized: 1, unchanged: 0, failed: 0 })

  const select = queries.find((q) => q.sql.includes('SELECT id, title, artist FROM tracks'))
  assert.doesNotMatch(select.sql, /id IN/)
  assert.deepEqual(select.params, ['client-1'])
})

test('es idempotente y no actualiza filas ya limpias', async () => {
  installPoolMock()
  selectRows = [
    { id: 'trk-1', title: 'Tema', artist: 'Artista' },
    { id: 'trk-2', title: 'Otra Canción', artist: 'Mi Banda' },
  ]

  const res = await normalizeRequest()
  assert.deepEqual(res.json(), { ok: true, scanned: 2, normalized: 0, unchanged: 2, failed: 0 })
  assert.equal(queries.filter((q) => q.sql.includes('UPDATE tracks SET title')).length, 0)
})

test('un track que falla no impide normalizar los demás', async () => {
  installPoolMock()
  failUpdateForId = 'trk-bad'
  selectRows = [
    { id: 'trk-1', title: 'Tema (HD)', artist: 'A' },
    { id: 'trk-bad', title: 'Otro (Live)', artist: 'B' },
    { id: 'trk-3', title: 'Tercero (Remix)', artist: 'C' },
  ]

  const res = await normalizeRequest({ trackIds: ['trk-1', 'trk-bad', 'trk-3'] })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { ok: true, scanned: 3, normalized: 2, unchanged: 0, failed: 1 })

  const updatedIds = queries
    .filter((q) => q.sql.includes('UPDATE tracks SET title'))
    .map((q) => q.params[2])
  assert.deepEqual(updatedIds.sort(), ['trk-1', 'trk-3'])
})

test('registra la auditoría de la normalización', async () => {
  installPoolMock()
  selectRows = [{ id: 'trk-1', title: 'Tema (HD)', artist: 'A' }]

  await normalizeRequest({ trackIds: ['trk-1'] })
  const audit = queries.find((q) => q.sql.includes('tracks_normalize'))
  assert.ok(audit)
  assert.equal(audit.params[1], 'client-1')
  assert.deepEqual(JSON.parse(audit.params[2]), {
    scanned: 1,
    normalized: 1,
    unchanged: 0,
    failed: 0,
  })
})
