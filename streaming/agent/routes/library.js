// =====================================================
// Routes — Library (MP3 CRUD por cliente)
// =====================================================

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { readMetadata, sanitizeFileName, isMp3 } from '../lib/id3.js'
import { saveMp3, deleteMp3, clientMp3Dir, isSafeFileName, ensureClientDir } from '../lib/files.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50 MB

export default async function libraryRoutes(app) {
  /**
   * GET /api/streams/:clientId/library
   * Lista los tracks del cliente.
   */
  app.get('/api/streams/:clientId/library', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(
      `SELECT id, title, artist, album, duration, fileName, fileSize, mimeType, uploadedAt, updatedAt
       FROM tracks WHERE clientId = ? ORDER BY uploadedAt DESC`,
      [clientId]
    )
    return { count: rows.length, tracks: rows }
  })

  /**
   * POST /api/streams/:clientId/library/upload
   * Sube un MP3. Multipart con campo "file".
   * Lee ID3, guarda en filesystem, inserta en DB.
   */
  app.post('/api/streams/:clientId/library/upload', async (request, reply) => {
    const { clientId } = request.params

    // Verificar que el cliente y su RadioStream existen
    const [rsRows] = await pool.query(
      `SELECT id FROM radio_streams WHERE clientId = ?`,
      [clientId]
    )
    if (rsRows.length === 0) {
      return reply.code(404).send({ error: 'radio_stream_not_found' })
    }
    const radioStreamId = rsRows[0].id

    let savedFileName = null
    try {
      // Parsear multipart manualmente (en este agente no usamos @fastify/multipart todavía
      // — usamos el parser nativo de Fastify o lo recibimos como raw body)
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'no_file', message: 'Falta el campo "file"' })
      }

      if (!isMp3(data.filename, data.mimetype)) {
        return reply.code(415).send({ error: 'unsupported_media_type', message: 'Solo se aceptan MP3' })
      }

      // Leer a buffer (con límite de tamaño)
      const buffer = await data.toBuffer()
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.code(413).send({ error: 'file_too_large', message: `Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB` })
      }

      // Guardar con nombre único
      const safeOriginal = sanitizeFileName(data.filename)
      const fileName = `${Date.now()}_${safeOriginal}`

      const { path: filePath, size } = await saveMp3(clientId, fileName, buffer)
      savedFileName = fileName

      // Leer ID3
      const meta = await readMetadata(filePath)

      // Insertar en DB
      const trackId = 'trk_' + uuid().slice(0, 8)
      await pool.query(
        `INSERT INTO tracks (id, clientId, radioStreamId, title, artist, album, duration,
          fileName, filePath, fileSize, mimeType, uploadedAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          trackId, clientId, radioStreamId,
          meta.title, meta.artist, meta.album, meta.duration,
          fileName, filePath, size, data.mimetype || 'audio/mpeg',
        ]
      )

      // Audit log
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
         VALUES (?, ?, 'track_upload', ?, NOW())`,
        [uuid(), clientId, JSON.stringify({ trackId, fileName, title: meta.title, size })]
      )

      logger.info({ clientId, trackId, fileName, size, title: meta.title }, 'Track uploaded')

      return {
        ok: true,
        track: {
          id: trackId,
          title: meta.title,
          artist: meta.artist,
          album: meta.album,
          duration: meta.duration,
          fileName,
          fileSize: size,
          mimeType: data.mimetype || 'audio/mpeg',
        },
      }
    } catch (err) {
      logger.error({ err, clientId, savedFileName }, 'Error uploading track')
      // Si guardamos el archivo pero falló algo después, intentar limpiar
      if (savedFileName) {
        try { await deleteMp3(clientId, savedFileName) } catch {}
      }
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  /**
   * PATCH /api/streams/:clientId/library/:trackId
   * Actualiza metadata del track (title, artist, album).
   */
  app.patch('/api/streams/:clientId/library/:trackId', async (request, reply) => {
    const { clientId, trackId } = request.params
    const { title, artist, album } = request.body || {}

    const sets = []
    const params = []
    if (typeof title === 'string' && title.length > 0) { sets.push('title = ?'); params.push(title.slice(0, 200)) }
    if (typeof artist === 'string') { sets.push('artist = ?'); params.push(artist.slice(0, 200)) }
    if (typeof album === 'string') { sets.push('album = ?'); params.push(album.slice(0, 200)) }
    if (sets.length === 0) {
      return reply.code(400).send({ error: 'no_fields', message: 'Envía al menos un campo' })
    }
    sets.push('updatedAt = NOW()')
    params.push(trackId, clientId)

    const [result] = await pool.query(
      `UPDATE tracks SET ${sets.join(', ')} WHERE id = ? AND clientId = ?`,
      params
    )
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    return { ok: true }
  })

  /**
   * DELETE /api/streams/:clientId/library/:trackId
   * Elimina el track del filesystem y de la DB.
   * También lo quita de todas las playlists.
   */
  app.delete('/api/streams/:clientId/library/:trackId', async (request, reply) => {
    const { clientId, trackId } = request.params

    // Buscar el track
    const [rows] = await pool.query(
      `SELECT id, fileName FROM tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    const track = rows[0]

    // Eliminar archivo del filesystem
    if (isSafeFileName(track.fileName)) {
      try {
        await deleteMp3(clientId, track.fileName)
      } catch (err) {
        logger.warn({ err, trackId, fileName: track.fileName }, 'No se pudo borrar el archivo')
      }
    }

    // Eliminar de DB (cascade borra playlist_entries)
    await pool.query(`DELETE FROM tracks WHERE id = ?`, [trackId])

    // Regenerar m3u (porque puede haber cambiado el contenido de la playlist activa)
    try { await regenerateM3u(clientId) } catch {}

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'track_delete', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ trackId, fileName: track.fileName })]
    )

    logger.info({ clientId, trackId, fileName: track.fileName }, 'Track deleted')
    return { ok: true }
  })
}
