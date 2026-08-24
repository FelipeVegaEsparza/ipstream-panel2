// =====================================================
// IPStream Streaming Agent — server entry
// Bootstrap Fastify + health check + auth + DB ping.
// =====================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
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
import folderRoutes from './routes/folders.js'
import statsRoutes, { startStatsCron, stopStatsCron } from './routes/stats.js'
import videoRoutes from './routes/video.js'
import videoScheduleRoutes, { startVideoScheduleCron } from './routes/video-schedule.js'
import { deployIcecastConfig } from './lib/icecast-config.js'
import { startDjWatcher, stopDjWatcher } from './lib/dj-watcher.js'
import { rebuildAllDjState } from './lib/dj-state.js'
import { autoStartStreams } from './lib/liquidsoap.js'
import { autoStartVideoStreams, execCmd, ENCODER_CONTAINER } from './lib/video-encoder.js'
import { startRetentionCron, stopRetentionCron } from './lib/retention.js'
import { startStreamSupervisor, stopStreamSupervisor } from './lib/stream-supervisor.js'
import { startHistoryCron, stopHistoryCron } from './lib/track-history.js'

const app = Fastify({
  logger,
  trustProxy: true,
  disableRequestLogging: false,
  ignoreTrailingSlash: true,   // auth-source pueda llegar con/sin trailing slash
  bodyLimit: 50 * 1024 * 1024, // 50 MB
})

// CORS: en producción solo orígenes explícitos; en dev se permite todo si no se configura.
let corsOrigin = true
if (config.corsAllowedOrigins.length > 0) {
  corsOrigin = config.corsAllowedOrigins
} else if (config.nodeEnv === 'production') {
  logger.warn('CORS_ALLOWED_ORIGINS no está configurado. En producción esto bloqueará peticiones CORS.')
  corsOrigin = false
}
await app.register(cors, { origin: corsOrigin, credentials: true })

// Rate limiting global
await app.register(rateLimit, {
  global: true,
  max: 200,
  timeWindow: '1 minute',
  allowList: (req) => {
    const url = req.url.split('?')[0]
    // Eximir health y callbacks internos de Liquidsoap
    return url === '/health' || url === '/healthz' || url.startsWith('/api/streams/auth-source')
  },
})

// Parser para form-urlencoded (Icecast auth-http-source envía este formato)
// Usamos regex para cubrir charset y otras variantes
app.addContentTypeParser(/^application\/x-www-form-urlencoded/, { parseAs: 'string' }, (_req, body, done) => {
  done(null, body)
})

// Multipart (para upload de MP3s)
await app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB
  attachFieldsToBuffer: false,
})

// WebSocket
await app.register(websocket, {
  options: { maxPayload: 1048576 },
})

// Hook de auth (aplica a todo excepto /health y auth-source POST)
app.addHook('onRequest', buildAuthHook(config.agentToken, config.harborCallbackSecret))

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
    authSource: 'POST /api/streams/auth-source',
    authSourceDiag: 'GET /api/streams/auth-source/diag',
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
    // Video (Televisión)
    videoStatus: 'GET /api/video/:clientId/status',
    videoStart: 'POST /api/video/:clientId/start',
    videoStop: 'POST /api/video/:clientId/stop',
    videoShuffle: 'POST /api/video/:clientId/shuffle',
    videoTracks: 'GET /api/video/:clientId/tracks',
    videoUpload: 'POST /api/video/:clientId/tracks/upload',
    videoDeleteTrack: 'DELETE /api/video/:clientId/tracks/:trackId',
    videoPlaylists: 'GET /api/video/:clientId/playlists',
    videoCreatePlaylist: 'POST /api/video/:clientId/playlists',
    videoPlaylistEntries: 'GET /api/video/:clientId/playlists/:playlistId/entries',
    videoAddToPlaylist: 'POST /api/video/:clientId/playlists/:playlistId/entries',
    videoRemoveEntry: 'DELETE /api/video/:clientId/playlists/:playlistId/entries/:entryId',
    videoReorderEntries: 'PUT /api/video/:clientId/playlists/:playlistId/entries/reorder',
    videoFolders: 'GET /api/video/:clientId/folders',
    videoStorage: 'GET /api/video/:clientId/storage',
    videoHistory: 'GET /api/video/:clientId/history',
    videoDjStatus: 'GET /api/video/dj-status/:clientId',
    videoEncoders: 'GET /api/video/encoders',
    videoHooksPublish: 'POST /api/video/hooks/on-publish',
    videoHooksUnpublish: 'POST /api/video/hooks/on-unpublish',
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
      INDEX idx_radio_day (radioStreamId, dayOfWeek, isActive),
      CONSTRAINT fk_ps_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_ps_radio FOREIGN KEY (radioStreamId) REFERENCES radio_streams(id) ON DELETE CASCADE
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
      INDEX idx_audit_action (action),
      CONSTRAINT fk_audit_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
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

try {
  await pool.query(`ALTER TABLE radio_streams ADD COLUMN IF NOT EXISTS autoStart BOOLEAN NOT NULL DEFAULT false`)
  logger.info('Columna autoStart en radio_streams asegurada')
} catch (err) {
  logger.info({ err: err.message }, 'Columna autoStart en radio_streams (ya existía o ignorado)')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS radio_djs (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      name VARCHAR(100) NOT NULL,
      mount VARCHAR(10) NOT NULL,
      priority INT NOT NULL DEFAULT 1,
      passwordEnc TEXT,
      role VARCHAR(10) NOT NULL DEFAULT 'guest',
      isActive BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      INDEX idx_radiodj_client (clientId),
      UNIQUE INDEX idx_radiodj_client_mount (clientId, mount),
      CONSTRAINT fk_radiodj_client FOREIGN KEY (clientId) REFERENCES radio_streams(clientId) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla radio_djs asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla radio_djs')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stream_stats (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      radioStreamId VARCHAR(191) NOT NULL,
      listenerCount INT NOT NULL,
      listenerPeak INT NOT NULL,
      currentTitle VARCHAR(191),
      currentArtist VARCHAR(191),
      timestamp DATETIME(3) NOT NULL,
      INDEX idx_stats_client_date (clientId, timestamp),
      INDEX idx_stats_radio_date (radioStreamId, timestamp),
      CONSTRAINT fk_stats_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_stats_radio FOREIGN KEY (radioStreamId) REFERENCES radio_streams(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla stream_stats asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla stream_stats')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS play_history (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      radioStreamId VARCHAR(191) NOT NULL,
      title VARCHAR(191),
      artist VARCHAR(191),
      type VARCHAR(20) NOT NULL DEFAULT 'autodj',
      playedAt DATETIME(3) NOT NULL,
      INDEX idx_ph_client_time (clientId, playedAt DESC),
      INDEX idx_ph_radio_time (radioStreamId, playedAt DESC),
      CONSTRAINT fk_ph_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_ph_radio FOREIGN KEY (radioStreamId) REFERENCES radio_streams(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla play_history asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla play_history')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dj_sessions (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      radioStreamId VARCHAR(191) NOT NULL,
      djId VARCHAR(191) NOT NULL,
      mount VARCHAR(10) NOT NULL,
      role VARCHAR(10) NOT NULL,
      ipAddress VARCHAR(45),
      startedAt DATETIME(3) NOT NULL,
      endedAt DATETIME(3),
      durationSeconds INT,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_djs_client_started (clientId, startedAt DESC),
      INDEX idx_djs_radio_started (radioStreamId, startedAt DESC),
      INDEX idx_djs_dj (djId),
      CONSTRAINT fk_djs_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_djs_radio FOREIGN KEY (radioStreamId) REFERENCES radio_streams(id) ON DELETE CASCADE,
      CONSTRAINT fk_djs_dj FOREIGN KEY (djId) REFERENCES radio_djs(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla dj_sessions asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla dj_sessions')
}

// Video tables
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_streams (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'off',
      mode VARCHAR(20) NOT NULL DEFAULT 'playlist',
      shuffle BOOLEAN NOT NULL DEFAULT false,
      \`repeat\` BOOLEAN NOT NULL DEFAULT true,
      autoStart BOOLEAN NOT NULL DEFAULT true,
      storageQuotaMB INT,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      INDEX idx_video_client (clientId),
      CONSTRAINT fk_video_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla video_streams asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla video_streams')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_tracks (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      videoStreamId VARCHAR(191) NOT NULL,
      title VARCHAR(191) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      filepath VARCHAR(512) NOT NULL,
      filesize BIGINT NOT NULL DEFAULT 0,
      duration DOUBLE NOT NULL DEFAULT 0,
      thumbnail VARCHAR(255),
      width INT,
      height INT,
      codec VARCHAR(31),
      folderId VARCHAR(191),
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_vt_client (clientId),
      INDEX idx_vt_stream (videoStreamId),
      INDEX idx_vt_folder (folderId),
      CONSTRAINT fk_vt_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_vt_stream FOREIGN KEY (videoStreamId) REFERENCES video_streams(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla video_tracks asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla video_tracks')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_playlists (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      name VARCHAR(191) NOT NULL,
      shuffle BOOLEAN NOT NULL DEFAULT false,
      \`repeat\` BOOLEAN NOT NULL DEFAULT true,
      isActive BOOLEAN NOT NULL DEFAULT false,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      INDEX idx_vp_client (clientId),
      INDEX idx_vp_active (clientId, isActive),
      CONSTRAINT fk_vp_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla video_playlists asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla video_playlists')
}

try {
  await pool.query(`ALTER TABLE video_playlists ADD COLUMN IF NOT EXISTS isActive BOOLEAN NOT NULL DEFAULT false`)
  logger.info('Columna isActive en video_playlists asegurada')
} catch (err) {
  logger.info({ err: err.message }, 'Columna isActive en video_playlists (ya existía o ignorado)')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_playlist_entries (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      playlistId VARCHAR(191) NOT NULL,
      trackId VARCHAR(191) NOT NULL,
      position INT NOT NULL,
      INDEX idx_vpe_playlist (playlistId, position),
      INDEX idx_vpe_track (trackId),
      CONSTRAINT fk_vpe_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_vpe_playlist FOREIGN KEY (playlistId) REFERENCES video_playlists(id) ON DELETE CASCADE,
      CONSTRAINT fk_vpe_track FOREIGN KEY (trackId) REFERENCES video_tracks(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla video_playlist_entries asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla video_playlist_entries')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_play_history (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      streamId VARCHAR(191) NOT NULL,
      trackId VARCHAR(191),
      trackType VARCHAR(20) NOT NULL DEFAULT 'music',
      title VARCHAR(191) NOT NULL,
      artist VARCHAR(191),
      thumbnail VARCHAR(255),
      playedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX idx_vph_client (clientId, streamId, playedAt),
      CONSTRAINT fk_vph_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla video_play_history asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla video_play_history')
}

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_playlist_schedules (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      clientId VARCHAR(191) NOT NULL,
      videoStreamId VARCHAR(191) NOT NULL,
      playlistId VARCHAR(191) NOT NULL,
      dayOfWeek INT NOT NULL,
      startTime VARCHAR(191) NOT NULL,
      endTime VARCHAR(191) NOT NULL,
      isActive BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL,
      INDEX idx_vps_client_day (clientId, dayOfWeek, isActive),
      INDEX idx_vps_stream_day (videoStreamId, dayOfWeek, isActive),
      CONSTRAINT fk_vps_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_vps_stream FOREIGN KEY (videoStreamId) REFERENCES video_streams(id) ON DELETE CASCADE,
      CONSTRAINT fk_vps_playlist FOREIGN KEY (playlistId) REFERENCES video_playlists(id) ON DELETE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `)
  logger.info('Tabla video_playlist_schedules asegurada')
} catch (err) {
  logger.error({ err: err.message }, 'Error creando tabla video_playlist_schedules')
}

// Migración: sanitizar filenames con espacios en video_tracks
try {
  const [tracksWithSpaces] = await pool.query(
    `SELECT id, filename, filepath FROM video_tracks WHERE filename LIKE '% %' OR filepath LIKE '% %'`
  )
  for (const track of tracksWithSpaces || []) {
    const newFilename = track.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const newFilepath = track.filepath.replace(/[^a-zA-Z0-9\/._-]/g, '_')
    const oldContainerPath = `/var/lib/video/${track.filepath}`
    const newContainerPath = `/var/lib/video/${newFilepath}`
    try {
      await execCmd(`docker exec ${ENCODER_CONTAINER} sh -c 'if [ -f "${oldContainerPath}" ]; then cp "${oldContainerPath}" "${newContainerPath}" && rm "${oldContainerPath}"; fi'`)
      await pool.query(
        `UPDATE video_tracks SET filename = ?, filepath = ? WHERE id = ?`,
        [newFilename, newFilepath, track.id]
      )
      logger.info({ id: track.id, old: track.filepath, new: newFilepath }, 'Migrated video track filename')
    } catch (e) {
      logger.warn({ id: track.id, err: e.message }, 'Failed to migrate video track filename')
    }
  }
} catch (err) {
  logger.warn({ err: err.message }, 'Error en migración de filenames video_tracks (no crítico)')
}

// Rutas
await app.register(streamRoutes)
await app.register(videoRoutes)
await app.register(videoScheduleRoutes)
await app.register(websocketRoutes)
await app.register(libraryRoutes)
await app.register(playlistRoutes)
await app.register(jingleRoutes)
await app.register(scheduleRoutes)
await app.register(statsRoutes)
  await app.register(folderRoutes)

  // Reconstruir estado DJ desde Liquidsoap antes de iniciar watchers
  // (solo streams running tienen puerto telnet activo).
  try {
    await rebuildAllDjState()
    logger.info('Rebuild DJ state completado')
  } catch (err) {
    logger.warn({ err: err.message }, 'Rebuild DJ state falló (no crítico)')
  }

  // Iniciar crons
  startScheduleCron()
  startVideoScheduleCron()
  startStatsCron()
  startDjWatcher()
  startRetentionCron()
  startStreamSupervisor()
  startHistoryCron()

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal recibido')
  try {
    stopStatsCron()
    stopDjWatcher()
    stopRetentionCron()
    stopStreamSupervisor()
    stopHistoryCron()
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
  // Deploy icecast config con per-client passwords
  deployIcecastConfig().then((r) => {
    logger.info({ ok: r.ok }, 'Deploy icecast config en startup')
  }).catch((err) => {
    logger.warn({ err: err.message }, 'Deploy icecast config en startup falló (no crítico)')
  })

  // Auto-start streams de radio
  autoStartStreams().then(async (result) => {
    logger.info({ started: result.started, failed: result.failed }, 'Auto-start radio streams completado')
    // Reconstruir estado DJ ahora que los streams running tienen telnet activo
    try {
      await rebuildAllDjState()
      logger.info('Rebuild DJ state post-auto-start completado')
    } catch (err) {
      logger.warn({ err: err.message }, 'Rebuild DJ state post-auto-start falló')
    }
  }).catch((err) => {
    logger.warn({ err: err.message }, 'Auto-start radio streams falló')
  })

  // Auto-start streams de televisión
  autoStartVideoStreams().then(() => {
    logger.info('Auto-start video streams completado')
  }).catch((err) => {
    logger.warn({ err: err.message }, 'Auto-start video streams falló')
  })
} catch (err) {
  logger.fatal({ err }, 'No se pudo arrancar el agent')
  process.exit(1)
}
