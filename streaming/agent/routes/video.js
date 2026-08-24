// =====================================================
// IPStream Video (Televisión) Routes
// =====================================================
// Endpoints para control de streaming de video.
// Usa pool.query() (raw MySQL) consistente con el resto del agente.
//
// SRS hooks:
//   on-publish   -> DJ conecta, detiene AutoDJ
//   on-unpublish -> DJ desconecta, reanuda AutoDJ

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import crypto from 'crypto'
import fs from 'fs'
import { startEncoder, stopEncoder, getEncoderStatus, getAllEncoders, generatePlaylist, extractThumbnail, autoStartVideoStreams, ENCODER_CONTAINER, getRelayIngestUrl, startTranscoder, stopTranscoder, getTranscoderStatus, resolvePlaylistEntries } from '../lib/video-encoder.js'
import { startTracking, stopTracking, getTrackHistory, detectAndLogVideoTrack } from '../lib/track-history-video.js'

// Estado en memoria: DJ conectados vía SRS
const _djActive = new Map() // clientId -> { streamKey, connectedAt }

function getStreamKey(clientId) {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

async function checkDJStatus(clientId) {
  const dj = _djActive.get(clientId)
  return dj ? { active: true, streamKey: dj.streamKey, connectedAt: dj.connectedAt } : { active: false }
}

function uuid() {
  return crypto.randomUUID()
}

async function ensureVideoStream(clientId) {
  const [rows] = await pool.query(
    `SELECT id, clientId, status, mode, autoStart, shuffle, \`repeat\`, storageQuotaMB, createdAt, updatedAt FROM video_streams WHERE clientId = ?`,
    [clientId]
  )
  if (rows && rows.length > 0) return rows[0]
  const id = uuid()
  await pool.query(
    `INSERT INTO video_streams (id, clientId, status, mode, shuffle, \`repeat\`, autoStart, createdAt, updatedAt)
     VALUES (?, ?, 'off', 'playlist', false, true, true, NOW(), NOW())`,
    [id, clientId]
  )
  return {
    id, clientId, status: 'off', mode: 'playlist',
    autoStart: 1, shuffle: 0, repeat: 1,
    storageQuotaMB: null, createdAt: new Date(), updatedAt: new Date(),
  }
}

export default async function videoRoutes(fastify) {

  // ================================================================
  // SRS Hooks
  // ================================================================

  // on-publish: DJ conecta a SRS por RTMP en los apps 'dj' (OBS directo) y
  // 'relay' (Conexión Universal).
  fastify.post('/api/video/hooks/on-publish', async (req, reply) => {
    const { app, stream } = req.body || {}

    // El app 'live' lo usan el encoder de AutoDJ: nunca es un DJ.
    if (app !== 'dj' && app !== 'relay') {
      reply.send({ code: 0, message: 'ignored' })
      return
    }

    if (!stream) {
      reply.send({ code: 0, message: 'no stream' })
      return
    }

    // Resolver el clientId a partir del stream key. SRS envía el campo
    // `stream` (nombre del stream), no `stream_key`.
    const [allStreams] = await pool.query(
      `SELECT clientId FROM video_streams`
    )
    const matched = allStreams.find(s => getStreamKey(s.clientId) === stream)
    if (!matched) {
      // Key desconocido: denegar el publish. SRS parsea el body con atol(),
      // un JSON {code:...} se lee siempre como 0 => responder entero plano.
      reply.type('text/plain').send('-1')
      return
    }

    const clientId = matched.clientId

    // Conexión Universal: OBS publica en SRS (app 'relay') con su key. El
    // transcoder re-publica en 'dj', y ese publish dispara el on-publish de
    // 'dj' de abajo (AutoDJ stop, status live, HLS).
    if (app === 'relay') {
      // Responder 0 primero para que SRS acepte al DJ, y arrancar el
      // transcoder async: así para cuando ffmpeg conecte el stream ya está
      // fluyendo y el HLS no nace con segmentos vacíos (pantalla negra).
      startTranscoder(clientId, stream).then((result) => {
        logger.info({ clientId }, `Universal connection accepted — transcoder ${result.status}`)
      }).catch((err) => {
        logger.error({ clientId, err: err.message }, 'Error starting transcoder')
      })
      reply.send({ code: 0, message: 'OK' })
      return
    }

    // App 'dj': DJ directo (OBS)
    _djActive.set(clientId, { streamKey: stream, connectedAt: new Date().toISOString() })

    await pool.query(`UPDATE video_streams SET status = 'live' WHERE clientId = ?`, [clientId])
    await stopEncoder(clientId)
    stopTracking(clientId)

    logger.info({ clientId }, 'DJ live on video — AutoDJ stopped')
    detectAndLogVideoTrack(clientId, 'dj', 'DJ conectado', null, null)

    reply.send({ code: 0, message: 'OK' })
  })

  // on-unpublish: DJ se desconecta de SRS (apps 'dj' y 'relay')
  fastify.post('/api/video/hooks/on-unpublish', async (req, reply) => {
    const { app, stream } = req.body || {}

    // Conexión Universal: detener el transcoder. Su unpublish en 'dj' dispara
    // el flujo de abajo que reanuda el AutoDJ.
    if (app === 'relay') {
      if (stream) {
        const [allStreams] = await pool.query(`SELECT clientId FROM video_streams`)
        const matched = allStreams.find(s => getStreamKey(s.clientId) === stream)
        if (matched) {
          await stopTranscoder(matched.clientId)
          logger.info({ clientId: matched.clientId }, 'Universal connection ended — transcoder stopped')
        }
      }
      reply.send({ code: 0, message: 'OK' })
      return
    }

    // El app 'live' lo usan el encoder de AutoDJ: no es un DJ.
    if (app !== 'dj') {
      reply.send({ code: 0, message: 'ignored' })
      return
    }

    // Resolver el clientId por el stream key (el DJ quedó registrado en on-publish)
    let clientId = null
    if (stream) {
      const entry = Array.from(_djActive.entries()).find(([_, v]) => v.streamKey === stream)
      if (entry) clientId = entry[0]
    }
    if (!clientId) {
      const [allStreams] = await pool.query(`SELECT clientId FROM video_streams`)
      const matched = allStreams.find(s => getStreamKey(s.clientId) === stream)
      if (matched) clientId = matched.clientId
    }

    if (!clientId) {
      reply.send({ code: 0, message: 'No active DJ' })
      return
    }

    _djActive.delete(clientId)

    await pool.query(`UPDATE video_streams SET status = 'autodj' WHERE clientId = ?`, [clientId])

    // Reanudar AutoDJ
    const streamKey = getStreamKey(clientId)
    await startEncoder(clientId, streamKey)
    startTracking(clientId, async (cid) => {
      const status = getEncoderStatus(cid)
      return status.currentTrack ? { trackId: status.currentTrack, trackType: 'autodj', title: status.currentTrack } : null
    })

    logger.info({ clientId }, 'DJ disconnected — AutoDJ resumed')
    detectAndLogVideoTrack(clientId, 'dj', 'DJ desconectado — retomando AutoDJ', null, null)

    reply.send({ code: 0, message: 'OK' })
  })

  // Consultar estado del DJ
  fastify.get('/api/video/dj-status/:clientId', async (req, reply) => {
    const { clientId } = req.params
    const dj = _djActive.get(clientId)
    return {
      active: !!dj,
      streamKey: dj?.streamKey || null,
      connectedAt: dj?.connectedAt || null,
    }
  })

  // ================================================================
  // Video Stream Control
  // ================================================================

  // Obtener estado del stream de video
  fastify.get('/api/video/:clientId/status', async (req, reply) => {
    const { clientId } = req.params

    const stream = await ensureVideoStream(clientId)
    const vs = stream
    const encoderStatus = getEncoderStatus(clientId)
    const djStatus = await checkDJStatus(clientId)
    const streamKey = getStreamKey(clientId)
    const transcoder = getTranscoderStatus(clientId)

    return {
      id: vs.id,
      status: vs.status,
      mode: vs.mode,
      autoStart: !!vs.autoStart,
      shuffle: !!vs.shuffle,
      repeat: !!vs.repeat,
      storageQuotaMB: vs.storageQuotaMB,
      streamKey,
      // El DJ (OBS) publica en el app 'dj'; el AutoDJ usa 'live'.
      rtmpUrl: `rtmp://localhost:1935/dj/${streamKey}`,
      // La Conexión Universal entra por SRS (puerto 1935) en el app 'relay',
      // con el mismo stream key. Siempre disponible.
      relayUrl: getRelayIngestUrl(),
      relay: transcoder,
      hlsUrl: `http://localhost:8080/${vs.status === 'live' ? 'dj' : 'live'}/${streamKey}.m3u8`,
      encoder: encoderStatus,
      dj: djStatus,
    }
  })

  // Iniciar AutoDJ
  fastify.post('/api/video/:clientId/start', async (req, reply) => {
    const { clientId } = req.params

    await ensureVideoStream(clientId)

    // Obtener entries de la playlist activa (o todas si no hay activa)
    const { entries } = await resolvePlaylistEntries(clientId)

    if (!entries || entries.length === 0) {
      reply.code(400).send({ code: 400, message: 'No hay videos en la playlist' })
      return
    }

    await generatePlaylist(clientId, entries.map(e => ({ filepath: e.filepath })))

    const streamKey = getStreamKey(clientId)
    const result = await startEncoder(clientId, streamKey)

    if (result.status === 'started') {
      await pool.query(`UPDATE video_streams SET status = 'autodj' WHERE clientId = ?`, [clientId])
      startTracking(clientId, async (cid) => {
        const status = getEncoderStatus(cid)
        return status.currentTrack ? { trackId: status.currentTrack, trackType: 'autodj', title: status.currentTrack } : null
      })
    }

    return result
  })

  // Detener AutoDJ
  fastify.post('/api/video/:clientId/stop', async (req, reply) => {
    const { clientId } = req.params
    const result = await stopEncoder(clientId)
    stopTracking(clientId)
    await pool.query(`UPDATE video_streams SET status = 'off' WHERE clientId = ?`, [clientId])
    return result
  })

  // Modo shuffle
  fastify.post('/api/video/:clientId/shuffle', async (req, reply) => {
    const { clientId } = req.params
    const { shuffle } = req.body
    await pool.query(`UPDATE video_streams SET shuffle = ? WHERE clientId = ?`, [!!shuffle, clientId])
    return { status: 'ok', shuffle: !!shuffle }
  })

  // ================================================================
  // CRUD Video Tracks
  // ================================================================

  fastify.get('/api/video/:clientId/tracks', async (req, reply) => {
    const { clientId } = req.params
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const offset = (page - 1) * limit
    const { folderId, search } = req.query

    let where = 'WHERE clientId = ?'
    const params = [clientId]

    if (folderId) {
      where += ' AND folderId = ?'
      params.push(folderId)
    }
    if (search) {
      where += ' AND title LIKE ?'
      params.push(`%${search}%`)
    }

    const [tracks] = await pool.query(
      `SELECT * FROM video_tracks ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM video_tracks ${where}`,
      params
    )

    return {
      tracks: tracks.map(t => ({
        ...t,
        thumbnail: t.thumbnail ? `/api/video/${clientId}/thumbnails/${encodeURIComponent(t.thumbnail.split('/').pop())}` : null,
      })),
      total: countRows[0].total,
      page,
      limit,
    }
  })

  // Servir thumbnails desde el container video-encoder
  fastify.get('/api/video/:clientId/thumbnails/:filename', async (req, reply) => {
    const { clientId, filename } = req.params
    const thumbnailPath = `/var/lib/video/thumbnails/${clientId}/${filename}`
    const { exec } = await import('child_process')
    const execPromise = (cmd) => new Promise((resolve, reject) => {
      exec(cmd, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err) reject(err)
        else resolve(stdout)
      })
    })
    try {
      const buf = await execPromise(`docker exec ${ENCODER_CONTAINER} cat '${thumbnailPath}'`)
      reply.header('Content-Type', 'image/jpeg')
      reply.header('Cache-Control', 'public, max-age=3600')
      return reply.send(buf)
    } catch {
      reply.code(404).send({ error: 'Thumbnail not found' })
    }
  })

  // Subir un video
  fastify.post('/api/video/:clientId/tracks/upload', async (req, reply) => {
    const { clientId } = req.params
    const data = await req.file()

    if (!data) {
      reply.code(400).send({ code: 400, message: 'No file uploaded' })
      return
    }

    const stream = await ensureVideoStream(clientId)
    const videoStreamId = stream.id
    const safeFilename = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `${Date.now()}_${safeFilename}`
    const filepath = `user_${clientId}/${filename}`

    // Leer archivo a buffer y copiar al contenedor video-encoder
    const buffer = await data.toBuffer()
    const tmpFile = `/tmp/video_upload_${clientId}_${Date.now()}`
    fs.writeFileSync(tmpFile, buffer)

    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    await execAsync(`docker exec ipstream-video-encoder mkdir -p '/var/lib/video/user_${clientId}'`)
    await execAsync(`docker cp '${tmpFile}' 'ipstream-video-encoder:/var/lib/video/${filepath}'`)
    fs.unlinkSync(tmpFile)

    // Extraer metadatos
    let duration = 0, width = null, height = null, codec = null
    try {
      const { stdout } = await execAsync(
        `docker exec ipstream-video-encoder ffprobe -v quiet -print_format json -show_format -show_streams '/var/lib/video/${filepath}'`
      )
      const info = JSON.parse(stdout)
      if (info.format) duration = parseFloat(info.format.duration || 0)
      const vs = info.streams?.find(s => s.codec_type === 'video')
      if (vs) {
        width = vs.width || null
        height = vs.height || null
        codec = vs.codec_name || null
      }
    } catch (e) {
      logger.warn({ err: e.message }, 'Error probing video')
    }

    const thumbnail = await extractThumbnail(clientId, filepath)

    const id = uuid()
    await pool.query(
      `INSERT INTO video_tracks (id, clientId, videoStreamId, title, filename, filepath, filesize, duration, thumbnail, width, height, codec, folderId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, clientId, videoStreamId, data.filename.replace(/\.[^/.]+$/, ''), filename, filepath, buffer.length, duration, thumbnail, width, height, codec, data.fields?.folderId || null]
    )

    const [track] = await pool.query(`SELECT * FROM video_tracks WHERE id = ?`, [id])
    return { track: track[0] }
  })

  // Eliminar track
  fastify.delete('/api/video/:clientId/tracks/:trackId', async (req, reply) => {
    const { clientId, trackId } = req.params

    const [rows] = await pool.query(`SELECT filepath, thumbnail FROM video_tracks WHERE id = ? AND clientId = ?`, [trackId, clientId])
    if (!rows || rows.length === 0) {
      reply.code(404).send({ code: 404, message: 'Track not found' })
      return
    }

    const track = rows[0]
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      await execAsync(`docker exec ipstream-video-encoder rm -f '/var/lib/video/${track.filepath}' || true`)
      if (track.thumbnail) {
        await execAsync(`docker exec ipstream-video-encoder rm -f '${track.thumbnail}' || true`)
      }
    } catch (_) {}

    await pool.query(`DELETE FROM video_tracks WHERE id = ?`, [trackId])
    return { status: 'deleted' }
  })

  // ================================================================
  // CRUD Video Playlists
  // ================================================================

  fastify.get('/api/video/:clientId/playlists', async (req, reply) => {
    const { clientId } = req.params

    const [playlists] = await pool.query(
      `SELECT vp.*, (SELECT COUNT(*) FROM video_playlist_entries WHERE playlistId = vp.id) as trackCount
       FROM video_playlists vp WHERE vp.clientId = ? ORDER BY vp.updatedAt DESC`,
      [clientId]
    )

    return { playlists }
  })

  fastify.post('/api/video/:clientId/playlists', async (req, reply) => {
    const { clientId } = req.params
    const { name } = req.body

    const id = uuid()
    await pool.query(
      `INSERT INTO video_playlists (id, clientId, name, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())`,
      [id, clientId, name]
    )

    const [pl] = await pool.query(`SELECT * FROM video_playlists WHERE id = ?`, [id])
    return { playlist: pl[0] }
  })

  fastify.put('/api/video/:clientId/playlists/:playlistId', async (req, reply) => {
    const { clientId, playlistId } = req.params
    const { name } = req.body

    await pool.query(
      `UPDATE video_playlists SET name = ?, updatedAt = NOW() WHERE id = ? AND clientId = ?`,
      [name, playlistId, clientId]
    )

    const [pl] = await pool.query(`SELECT * FROM video_playlists WHERE id = ?`, [playlistId])
    return { playlist: pl[0] }
  })

  fastify.delete('/api/video/:clientId/playlists/:playlistId', async (req, reply) => {
    const { clientId, playlistId } = req.params

    const [rows] = await pool.query(`SELECT id FROM video_playlists WHERE id = ? AND clientId = ?`, [playlistId, clientId])
    if (!rows || rows.length === 0) {
      reply.code(404).send({ code: 404, message: 'Playlist not found' })
      return
    }

    await pool.query(`DELETE FROM video_playlists WHERE id = ?`, [playlistId])
    return { status: 'deleted' }
  })

  // Entries
  fastify.get('/api/video/:clientId/playlists/:playlistId/entries', async (req, reply) => {
    const { clientId, playlistId } = req.params

    const [entries] = await pool.query(
      `SELECT vpe.*, vt.id as trackId, vt.title, vt.duration, vt.thumbnail, vt.filepath
       FROM video_playlist_entries vpe
       JOIN video_tracks vt ON vt.id = vpe.trackId
       WHERE vpe.playlistId = ? AND vpe.clientId = ?
       ORDER BY vpe.position ASC`,
      [playlistId, clientId]
    )

    return {
      entries: entries.map(e => ({
        ...e,
        thumbnail: e.thumbnail ? `/api/video/${clientId}/thumbnails/${encodeURIComponent(e.thumbnail.split('/').pop())}` : null,
      })),
    }
  })

  fastify.post('/api/video/:clientId/playlists/:playlistId/entries', async (req, reply) => {
    const { clientId, playlistId } = req.params
    const { trackId } = req.body

    const [maxRow] = await pool.query(
      `SELECT COALESCE(MAX(position), 0) as maxPos FROM video_playlist_entries WHERE playlistId = ?`,
      [playlistId]
    )

    const id = uuid()
    const position = Number(maxRow[0].maxPos) + 1

    await pool.query(
      `INSERT INTO video_playlist_entries (id, clientId, playlistId, trackId, position) VALUES (?, ?, ?, ?, ?)`,
      [id, clientId, playlistId, trackId, position]
    )

    const [entry] = await pool.query(
      `SELECT vpe.*, vt.title, vt.duration, vt.thumbnail
       FROM video_playlist_entries vpe
       JOIN video_tracks vt ON vt.id = vpe.trackId
       WHERE vpe.id = ?`,
      [id]
    )

    return { entry: entry[0] }
  })

  fastify.delete('/api/video/:clientId/playlists/:playlistId/entries/:entryId', async (req, reply) => {
    const { clientId, entryId } = req.params

    const [rows] = await pool.query(
      `SELECT id FROM video_playlist_entries WHERE id = ? AND clientId = ?`,
      [entryId, clientId]
    )
    if (!rows || rows.length === 0) {
      reply.code(404).send({ code: 404, message: 'Entry not found' })
      return
    }

    await pool.query(`DELETE FROM video_playlist_entries WHERE id = ?`, [entryId])
    return { status: 'deleted' }
  })

  // Reordenar
  fastify.put('/api/video/:clientId/playlists/:playlistId/entries/reorder', async (req, reply) => {
    const { clientId, playlistId } = req.params
    const { entryIds } = req.body

    for (let i = 0; i < entryIds.length; i++) {
      await pool.query(
        `UPDATE video_playlist_entries SET position = ? WHERE id = ? AND clientId = ? AND playlistId = ?`,
        [i + 1, entryIds[i], clientId, playlistId]
      )
    }

    return { status: 'reordered' }
  })

  // ================================================================
  // Folders
  // ================================================================

  fastify.get('/api/video/:clientId/folders', async (req, reply) => {
    const { clientId } = req.params

    const [folders] = await pool.query(
      `SELECT f.*, (SELECT COUNT(*) FROM video_tracks vt WHERE vt.folderId = f.id) as trackCount
       FROM folders f WHERE f.clientId = ? ORDER BY f.name ASC`,
      [clientId]
    )

    return { folders }
  })

  fastify.post('/api/video/:clientId/folders', async (req, reply) => {
    const { clientId } = req.params
    const { name, parentId } = req.body

    const id = uuid()
    await pool.query(
      `INSERT INTO folders (id, clientId, name, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id, clientId, name, parentId || null]
    )

    const [folder] = await pool.query(`SELECT * FROM folders WHERE id = ?`, [id])
    return { folder: folder[0] }
  })

  fastify.put('/api/video/:clientId/folders/:folderId', async (req, reply) => {
    const { clientId, folderId } = req.params
    const { name } = req.body

    await pool.query(
      `UPDATE folders SET name = ?, updatedAt = NOW() WHERE id = ? AND clientId = ?`,
      [name, folderId, clientId]
    )

    const [folder] = await pool.query(`SELECT * FROM folders WHERE id = ?`, [folderId])
    if (!folder || folder.length === 0) {
      reply.code(404).send({ code: 404, message: 'Folder not found' })
      return
    }

    return { folder: folder[0] }
  })

  fastify.delete('/api/video/:clientId/folders/:folderId', async (req, reply) => {
    const { clientId, folderId } = req.params

    await pool.query(`UPDATE video_tracks SET folderId = NULL WHERE folderId = ? AND clientId = ?`, [folderId, clientId])
    await pool.query(`DELETE FROM folders WHERE id = ? AND clientId = ?`, [folderId, clientId])

    return { status: 'deleted' }
  })

  // Batch move
  fastify.post('/api/video/:clientId/tracks/batch-move', async (req, reply) => {
    const { clientId } = req.params
    const { trackIds, folderId } = req.body

    const placeholders = trackIds.map(() => '?').join(',')
    await pool.query(
      `UPDATE video_tracks SET folderId = ? WHERE id IN (${placeholders}) AND clientId = ?`,
      [folderId || null, ...trackIds, clientId]
    )

    return { status: 'moved', count: trackIds.length }
  })

  // ================================================================
  // Storage
  // ================================================================

  fastify.get('/api/video/:clientId/storage', async (req, reply) => {
    const { clientId } = req.params

    const [agg] = await pool.query(
      `SELECT COALESCE(SUM(filesize), 0) as totalBytes, COUNT(*) as trackCount FROM video_tracks WHERE clientId = ?`,
      [clientId]
    )

    const [quotaRow] = await pool.query(
      `SELECT storageQuotaMB FROM video_streams WHERE clientId = ?`,
      [clientId]
    )

    const totalBytes = Number(agg[0].totalBytes)
    const totalMB = totalBytes / (1024 * 1024)
    const quotaMB = quotaRow[0]?.storageQuotaMB || null
    const quotaBytes = quotaMB !== null ? quotaMB * 1024 * 1024 : null

    let percentUsed = null
    let remainingMB = null
    if (quotaBytes !== null && quotaBytes > 0) {
      percentUsed = Math.min(100, (totalBytes / quotaBytes) * 100)
      remainingMB = Math.max(0, quotaMB - totalMB)
    }

    return {
      totalBytes,
      totalMB: Math.round(totalMB * 100) / 100,
      trackCount: agg[0].trackCount,
      quotaMB,
      percentUsed: percentUsed !== null ? Math.round(percentUsed * 10) / 10 : null,
      remainingMB: remainingMB !== null ? Math.round(remainingMB * 10) / 10 : null,
    }
  })

  // ================================================================
  // Track History
  // ================================================================

  fastify.get('/api/video/:clientId/history', async (req, reply) => {
    const { clientId } = req.params
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25

    const history = getTrackHistory(clientId, page, limit)
    return history
  })

  // ================================================================
  // All encoders
  // ================================================================

  fastify.get('/api/video/encoders', async (req, reply) => {
    const encoders = getAllEncoders()
    const djStatus = {}
    for (const clientId of Object.keys(encoders)) {
      djStatus[clientId] = await checkDJStatus(clientId)
    }
    return { encoders, dj: djStatus }
  })
}
