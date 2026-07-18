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
import jingleRoutes from './routes/jingles.js'
import scheduleRoutes, { startScheduleCron } from './routes/schedule.js'

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
    nowPlaying: 'GET /api/streams/:clientId/now-playing',
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
    listJingles: 'GET /api/streams/:clientId/jingles',
    uploadJingle: 'POST /api/streams/:clientId/jingles/upload',
    updateJingle: 'PATCH /api/streams/:clientId/jingles/:jingleId',
    deleteJingle: 'DELETE /api/streams/:clientId/jingles/:jingleId',
    getJingleCover: 'GET /api/streams/:clientId/jingles/:jingleId/cover',
    uploadJingleCover: 'POST /api/streams/:clientId/jingles/:jingleId/cover',
    deleteJingleCover: 'DELETE /api/streams/:clientId/jingles/:jingleId/cover',
    getJingleConfig: 'GET /api/streams/:clientId/jingles/config',
    updateJingleConfig: 'PATCH /api/streams/:clientId/jingles/config',
    listSchedule: 'GET /api/streams/:clientId/schedule',
    createSchedule: 'POST /api/streams/:clientId/schedule',
    updateSchedule: 'PATCH /api/streams/:clientId/schedule/:id',
    deleteSchedule: 'DELETE /api/streams/:clientId/schedule/:id',
    currentSchedule: 'GET /api/streams/:clientId/schedule/current',
  },
}))

// Auto-migración: asegurar tablas que el agente necesita
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jingles (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      radioStreamId VARCHAR(191) NOT NULL,
      title VARCHAR(191) NOT NULL,
      artist VARCHAR(191),
      duration DOUBLE NOT NULL,
      fileName VARCHAR(191) NOT NULL,
      filePath VARCHAR(191) NOT NULL,
      fileSize INT NOT NULL,
      coverUrl VARCHAR(191),
      mimeType VARCHAR(191) NOT NULL DEFAULT 'audio/mpeg',
      uploadedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      INDEX idx_jingles_client (clientId),
      INDEX idx_jingles_radio (radioStreamId)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla jingles asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla jingles')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS playlist_schedules (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      radioStreamId VARCHAR(191) NOT NULL,
      playlistId VARCHAR(191) NOT NULL,
      dayOfWeek INT NOT NULL,
      startTime VARCHAR(191) NOT NULL,
      endTime VARCHAR(191) NOT NULL,
      isActive BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      INDEX idx_client_day (clientId, dayOfWeek, isActive),
      INDEX idx_radio_day (radioStreamId, dayOfWeek, isActive)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla playlist_schedules asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla playlist_schedules')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS streaming_audit_logs (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      action VARCHAR(191) NOT NULL,
      payload JSON,
      ipAddress VARCHAR(45),
      userAgent VARCHAR(500),
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_audit_client_date (clientId, createdAt),
      INDEX idx_audit_action (action)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla streaming_audit_logs asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla streaming_audit_logs')
}

// Asegurar columnas de jingles en radio_streams
try {
  await pool.query(`ALTER TABLE radio_streams ADD COLUMN IF NOT EXISTS jinglePlayEvery INT NOT NULL DEFAULT 5`)
  await pool.query(`ALTER TABLE radio_streams ADD COLUMN IF NOT EXISTS jinglePlayCount INT NOT NULL DEFAULT 1`)
  logger.info('Columnas jingle en radio_streams aseguradas')
} catch (err) {
  logger.info({ err: err.message }, 'Columnas jingle en radio_streams (ya existían o ignorado)')
}

// Rutas
await app.register(streamRoutes)
await app.register(websocketRoutes)
await app.register(libraryRoutes)
await app.register(playlistRoutes)
await app.register(jingleRoutes)
await app.register(scheduleRoutes)

// Iniciar cron de parrilla horaria
startScheduleCron()

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
