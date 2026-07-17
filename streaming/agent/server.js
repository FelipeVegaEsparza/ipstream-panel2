// =====================================================
// IPStream Streaming Agent — server entry
// Bootstrap Fastify + health check + auth + DB ping.
// =====================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import websocket from '@fastify/websocket'
import { config } from './lib/config.js'
import { logger } from './lib/logger.js'
import { buildAuthHook } from './lib/auth.js'
import { dbHealthCheck, pool } from './lib/db.js'
import streamRoutes from './routes/streams.js'
import websocketRoutes from './routes/ws.js'
import libraryRoutes from './routes/library.js'
import playlistRoutes from './routes/playlists.js'

const app = Fastify({
  logger,
  trustProxy: true,
  disableRequestLogging: false,
  bodyLimit: 50 * 1024 * 1024, // 50 MB
})

// CORS: solo el panel debería llamar. Por ahora permito todo en dev.
await app.register(cors, { origin: true, credentials: true })

// Multipart (para upload de MP3s)
await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB
  attachFieldsToBuffer: false,
})

// WebSocket
await app.register(websocket, {
  options: { maxPayload: 1048576 },
})

// Hook de auth (aplica a todo excepto /health)
app.addHook('onRequest', buildAuthHook(config.agentToken))

// Health check
app.get('/health', async (request, reply) => {
  const checks = { agent: 'ok', db: 'unknown', icecast: 'unknown' }
  try {
    await dbHealthCheck()
    checks.db = 'ok'
  } catch (err) {
    checks.db = `error: ${err.message}`
  }
  try {
    const res = await fetch(`http://${config.ice.host}:${config.ice.port}/status-json.xsl`, {
      signal: AbortSignal.timeout(3000),
    })
    checks.icecast = res.ok ? 'ok' : `error: ${res.status}`
  } catch (err) {
    checks.icecast = `error: ${err.message}`
  }
  const allOk = Object.values(checks).every((v) => v === 'ok')
  reply.code(allOk ? 200 : 503).send({
    status: allOk ? 'ok' : 'degraded',
    service: 'ipstream-streaming-agent',
    version: '0.1.0',
    checks,
    timestamp: new Date().toISOString(),
  })
})

// Root
app.get('/', async () => ({
  service: 'ipstream-streaming-agent',
  version: '0.1.0',
  endpoints: {
    health: 'GET /health',
    listStreams: 'GET /api/streams',
    getStream: 'GET /api/streams/:clientId',
    streamStatus: 'GET /api/streams/:clientId/status',
    startStream: 'POST /api/streams/:clientId/start',
    stopStream: 'POST /api/streams/:clientId/stop',
    restartStream: 'POST /api/streams/:clientId/restart',
    regenerateM3u: 'POST /api/streams/:clientId/regenerate-m3u',
    icecastStatus: 'GET /api/icecast/status',
    liveStatus: 'WS /ws/streams/:clientId',
    listLibrary: 'GET /api/streams/:clientId/library',
    uploadTrack: 'POST /api/streams/:clientId/library/upload',
    updateTrack: 'PATCH /api/streams/:clientId/library/:trackId',
    deleteTrack: 'DELETE /api/streams/:clientId/library/:trackId',
    listPlaylists: 'GET /api/streams/:clientId/playlists',
    getPlaylist: 'GET /api/streams/:clientId/playlists/:id',
    createPlaylist: 'POST /api/streams/:clientId/playlists',
    updatePlaylist: 'PATCH /api/streams/:clientId/playlists/:id',
    deletePlaylist: 'DELETE /api/streams/:clientId/playlists/:id',
    activatePlaylist: 'POST /api/streams/:clientId/playlists/:id/activate',
    addTrackToPlaylist: 'POST /api/streams/:clientId/playlists/:id/tracks',
    removeTrackFromPlaylist: 'DELETE /api/streams/:clientId/playlists/:id/tracks/:trackId',
    reorderPlaylist: 'POST /api/streams/:clientId/playlists/:id/reorder',
  },
}))

// Rutas
await app.register(streamRoutes)
await app.register(websocketRoutes)
await app.register(libraryRoutes)
await app.register(playlistRoutes)

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal recibido')
  try {
    await app.close()
    await pool.end()
    logger.info('Cleanup completo. Saliendo.')
    process.exit(0)
  } catch (err) {
    logger.error({ err }, 'Error durante shutdown')
    process.exit(1)
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start
try {
  await app.listen({ port: config.port, host: config.host })
  logger.info(`Streaming agent escuchando en http://${config.host}:${config.port}`)
} catch (err) {
  logger.fatal({ err }, 'No se pudo arrancar el agent')
  process.exit(1)
}
