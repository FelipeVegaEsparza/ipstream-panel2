import test from 'node:test'
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

const { default: videoRoutes } = await import('../routes/video.js')

const app = Fastify()
await app.register(videoRoutes)
await app.ready()

test('on-publish de radio entra al branch de la consola (no lo ignora)', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/video/hooks/on-publish',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ app: 'radio', stream: 'sesion-inexistente' }),
  })

  assert.equal(res.statusCode, 200)
  // Sin sesión en memoria, el branch de radio responde -1. Si volviera
  // "ignored", el guard temprano lo estaría descartando de nuevo.
  assert.equal(res.body, '-1')
})

test('on-publish de un app desconocido sigue ignorado', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/video/hooks/on-publish',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ app: 'live', stream: 'x' }),
  })

  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json(), { code: 0, message: 'ignored' })
})
