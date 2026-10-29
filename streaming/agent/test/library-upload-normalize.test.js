import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const libraryDir = await mkdtemp(join(tmpdir(), 'ipstream-library-'))

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
process.env.RADIO_LIBRARY_PATH = libraryDir

const { default: libraryRoutes } = await import('../routes/library.js')
const { pool } = await import('../lib/db.js')

const app = Fastify()
await app.register(multipart)
await app.register(libraryRoutes)
await app.ready()

after(async () => {
  await app.close()
  await rm(libraryDir, { recursive: true, force: true })
})

function multipartBody(filename, content) {
  const boundary = '----ipstream-test-boundary'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/mpeg\r\n\r\n`
    ),
    Buffer.from(content),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

test('el upload guarda título y artista normalizados sin tocar fileName', async () => {
  const inserts = []
  const originalQuery = pool.query
  pool.query = async (sql, params) => {
    const text = String(sql)
    if (text.includes('SELECT id FROM radio_streams')) return [[{ id: 'rs-1' }]]
    if (text.includes('information_schema.COLUMNS')) return [[{ COLUMN_NAME: 'coverUrl' }]]
    if (text.includes('INSERT INTO tracks')) {
      inserts.push(params)
      return [{}]
    }
    return [{}]
  }

  try {
    const { body, contentType } = multipartBody(
      '03_Mi_Banda_-_Otra_Cancion.mp3',
      'esto no es un mp3 real'
    )
    const res = await app.inject({
      method: 'POST',
      url: '/api/streams/client-1/library/upload',
      headers: { 'content-type': contentType },
      payload: body,
    })

    assert.equal(res.statusCode, 200)
    assert.equal(inserts.length, 1)
    const params = inserts[0]
    assert.equal(params[3], 'Otra Cancion')
    assert.equal(params[4], 'Mi Banda')
    assert.match(params[7], /_03_Mi_Banda_-_Otra_Cancion\.mp3$/)
    assert.notEqual(params[7], '03_Mi_Banda_-_Otra_Cancion.mp3')

    const json = res.json()
    assert.equal(json.track.title, 'Otra Cancion')
    assert.equal(json.track.artist, 'Mi Banda')
    assert.match(json.track.fileName, /_03_Mi_Banda_-_Otra_Cancion\.mp3$/)
  } finally {
    pool.query = originalQuery
  }
})
