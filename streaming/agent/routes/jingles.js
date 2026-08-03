import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { readMetadata, sanitizeFileName, isMp3 } from '../lib/id3.js'
import { saveJingle, deleteJingleFile, saveCover, deleteCover, getCoverPath, isSafeFileName, uniqueFileName } from '../lib/files.js'
import { regenerateJinglesM3u, restartStream } from '../lib/liquidsoap.js'
import { existsSync, createReadStream } from 'fs'
import { readFile, stat } from 'fs/promises'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

const MAX_FILE_SIZE = 50 * 1024 * 1024

let hasCoverColumn = false
let coverCheckDone = false

async function ensureCoverColumn() {
  if (coverCheckDone) return hasCoverColumn
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jingles' AND COLUMN_NAME = 'coverUrl'`
    )
    hasCoverColumn = rows.length > 0
  } catch {
    hasCoverColumn = false
  }
  coverCheckDone = true
  return hasCoverColumn
}

async function queryJingles(clientId) {
  if (await ensureCoverColumn()) {
    const [rows] = await pool.query(
      `SELECT id, title, artist, duration, fileName, fileSize, coverUrl, mimeType, uploadedAt, updatedAt
       FROM jingles WHERE clientId = ? ORDER BY uploadedAt DESC`,
      [clientId]
    )
    return rows
  }
  const [rows] = await pool.query(
    `SELECT id, title, artist, duration, fileName, fileSize, mimeType, uploadedAt, updatedAt
     FROM jingles WHERE clientId = ? ORDER BY uploadedAt DESC`,
    [clientId]
  )
  return rows.map((r) => ({ ...r, coverUrl: null }))
}

async function queryJingleById(jingleId, clientId) {
  if (await ensureCoverColumn()) {
    const [rows] = await pool.query(
      `SELECT id, fileName, coverUrl FROM jingles WHERE id = ? AND clientId = ?`,
      [jingleId, clientId]
    )
    return rows
  }
  const [rows] = await pool.query(
    `SELECT id, fileName FROM jingles WHERE id = ? AND clientId = ?`,
    [jingleId, clientId]
  )
  return rows.map((r) => ({ ...r, coverUrl: null }))
}

export default async function jingleRoutes(app) {
  /**
   * GET /api/streams/:clientId/jingles
   * Lista todos los jingles de un cliente.
   */
  app.get('/api/streams/:clientId/jingles', async (request, reply) => {
    const { clientId } = request.params
    const rows = await queryJingles(clientId)
    return { count: rows.length, jingles: rows }
  })

  /**
   * POST /api/streams/:clientId/jingles/upload
   * Sube un nuevo jingle (MP3).
   */
  app.post('/api/streams/:clientId/jingles/upload', async (request, reply) => {
    const { clientId } = request.params

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
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'no_file', message: 'Falta el campo "file"' })
      }

      if (!isMp3(data.filename, data.mimetype)) {
        return reply.code(415).send({ error: 'unsupported_media_type', message: 'Solo se aceptan MP3' })
      }

      const buffer = await data.toBuffer()
      if (buffer.length > MAX_FILE_SIZE) {
        return reply.code(413).send({ error: 'file_too_large', message: `Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB` })
      }

      const fileName = uniqueFileName(data.filename)

      const { path: filePath, size } = await saveJingle(clientId, fileName, buffer)
      savedFileName = fileName

      const meta = await readMetadata(filePath)

      const jingleId = 'jng_' + uuid().slice(0, 8)
      let coverUrl = null

      if (meta.coverBuffer) {
        await saveCover(clientId, jingleId, meta.coverBuffer)
        coverUrl = `/api/dashboard/streaming/jingles/${jingleId}/cover`
      }

      if (await ensureCoverColumn()) {
        await pool.query(
          `INSERT INTO jingles (id, clientId, radioStreamId, title, artist, duration,
            fileName, filePath, fileSize, coverUrl, mimeType, uploadedAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            jingleId, clientId, radioStreamId,
            meta.title, meta.artist, meta.duration,
            fileName, filePath, size, coverUrl, data.mimetype || 'audio/mpeg',
          ]
        )
      } else {
        await pool.query(
          `INSERT INTO jingles (id, clientId, radioStreamId, title, artist, duration,
            fileName, filePath, fileSize, mimeType, uploadedAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            jingleId, clientId, radioStreamId,
            meta.title, meta.artist, meta.duration,
            fileName, filePath, size, data.mimetype || 'audio/mpeg',
          ]
        )
      }

      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
         VALUES (?, ?, 'jingle_upload', ?, NOW())`,
        [uuid(), clientId, JSON.stringify({ jingleId, fileName, title: meta.title, size })]
      )

      try { await regenerateJinglesM3u(clientId) } catch {}

      logger.info({ clientId, jingleId, fileName, size, title: meta.title }, 'Jingle uploaded')

      return {
        ok: true,
        jingle: {
          id: jingleId,
          title: meta.title,
          artist: meta.artist,
          duration: meta.duration,
          fileName,
          fileSize: size,
          coverUrl,
          mimeType: data.mimetype || 'audio/mpeg',
        },
      }
    } catch (err) {
      logger.error({ err, clientId, savedFileName }, 'Error uploading jingle')
      if (savedFileName) {
        try { await deleteJingleFile(clientId, savedFileName) } catch {}
      }
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  /**
   * PATCH /api/streams/:clientId/jingles/:jingleId
   * Edita metadatos de un jingle.
   */
  app.patch('/api/streams/:clientId/jingles/:jingleId', async (request, reply) => {
    const { clientId, jingleId } = request.params
    const { title, artist } = request.body || {}

    const sets = []
    const params = []
    if (typeof title === 'string' && title.length > 0) { sets.push('title = ?'); params.push(title.slice(0, 200)) }
    if (typeof artist === 'string') { sets.push('artist = ?'); params.push(artist.slice(0, 200)) }
    if (sets.length === 0) {
      return reply.code(400).send({ error: 'no_fields', message: 'Envía al menos un campo' })
    }
    sets.push('updatedAt = NOW()')
    params.push(jingleId, clientId)

    const [result] = await pool.query(
      `UPDATE jingles SET ${sets.join(', ')} WHERE id = ? AND clientId = ?`,
      params
    )
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    return { ok: true }
  })

  /**
   * DELETE /api/streams/:clientId/jingles/:jingleId
   * Elimina un jingle y su archivo.
   */
  app.delete('/api/streams/:clientId/jingles/:jingleId', async (request, reply) => {
    const { clientId, jingleId } = request.params

    const [rows] = await pool.query(
      `SELECT id, fileName FROM jingles WHERE id = ? AND clientId = ?`,
      [jingleId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    const jingle = rows[0]

    if (isSafeFileName(jingle.fileName)) {
      try {
        await deleteJingleFile(clientId, jingle.fileName)
      } catch (err) {
        logger.warn({ err, jingleId, fileName: jingle.fileName }, 'No se pudo borrar el archivo jingle')
      }
    }

    try {
      await deleteCover(clientId, jingleId)
    } catch (err) {
      logger.warn({ err, jingleId }, 'No se pudo borrar la carátula del jingle')
    }

    await pool.query(`DELETE FROM jingles WHERE id = ?`, [jingleId])

    try { await regenerateJinglesM3u(clientId) } catch {}

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'jingle_delete', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ jingleId, fileName: jingle.fileName })]
    )

    logger.info({ clientId, jingleId, fileName: jingle.fileName }, 'Jingle deleted')
    return { ok: true }
  })

  /**
   * GET /api/streams/:clientId/jingles/:jingleId/cover
   * Sirve la imagen de carátula del jingle.
   */
  app.get('/api/streams/:clientId/jingles/:jingleId/cover', async (request, reply) => {
    const { clientId, jingleId } = request.params
    const coverPath = getCoverPath(clientId, jingleId)

    if (!existsSync(coverPath)) {
      return reply.code(404).send({ error: 'cover_not_found' })
    }

    const ext = coverPath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    const image = await readFile(coverPath)
    return reply.type(ext).send(image)
  })

  /**
   * POST /api/streams/:clientId/jingles/:jingleId/cover
   * Sube o reemplaza la carátula de un jingle.
   */
  app.post('/api/streams/:clientId/jingles/:jingleId/cover', async (request, reply) => {
    const { clientId, jingleId } = request.params

    const [rows] = await pool.query(
      `SELECT id FROM jingles WHERE id = ? AND clientId = ?`,
      [jingleId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    try {
      const data = await request.file()
      if (!data) {
        return reply.code(400).send({ error: 'no_file', message: 'Falta el campo "cover"' })
      }

      const mime = data.mimetype || ''
      if (!mime.startsWith('image/')) {
        return reply.code(415).send({ error: 'unsupported_media_type', message: 'Solo se aceptan imágenes' })
      }

      const buffer = await data.toBuffer()
      if (buffer.length > 2 * 1024 * 1024) {
        return reply.code(413).send({ error: 'file_too_large', message: 'Máximo 2 MB' })
      }

      await saveCover(clientId, jingleId, buffer)
      const coverUrl = `/api/dashboard/streaming/jingles/${jingleId}/cover`

      if (await ensureCoverColumn()) {
        await pool.query(
          `UPDATE jingles SET coverUrl = ?, updatedAt = NOW() WHERE id = ?`,
          [coverUrl, jingleId]
        )
      }

      logger.info({ clientId, jingleId }, 'Jingle cover updated')
      return { ok: true, coverUrl }
    } catch (err) {
      logger.error({ err, clientId, jingleId }, 'Error uploading jingle cover')
      return reply.code(500).send({ error: 'cover_upload_failed', message: err.message })
    }
  })

  /**
   * DELETE /api/streams/:clientId/jingles/:jingleId/cover
   * Elimina la carátula de un jingle.
   */
  app.delete('/api/streams/:clientId/jingles/:jingleId/cover', async (request, reply) => {
    const { clientId, jingleId } = request.params

    const [rows] = await pool.query(
      `SELECT id FROM jingles WHERE id = ? AND clientId = ?`,
      [jingleId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    await deleteCover(clientId, jingleId)

    if (await ensureCoverColumn()) {
      await pool.query(
        `UPDATE jingles SET coverUrl = NULL, updatedAt = NOW() WHERE id = ?`,
        [jingleId]
      )
    }

    logger.info({ clientId, jingleId }, 'Jingle cover deleted')
    return { ok: true }
  })

  /**
   * GET /api/streams/:clientId/jingles/config
   * Obtiene la configuración de jingles del cliente.
   */
  app.get('/api/streams/:clientId/jingles/config', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(
      `SELECT jinglePlayEvery, jinglePlayCount FROM radio_streams WHERE clientId = ?`,
      [clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    return rows[0]
  })

  /**
   * PATCH /api/streams/:clientId/jingles/config
   * Actualiza la configuración de jingles (cada X canciones, Y jingles).
   * Además regenera el script de liquidsoap y reinicia el stream.
   */
  app.patch('/api/streams/:clientId/jingles/config', async (request, reply) => {
    const { clientId } = request.params
    const { jinglePlayEvery, jinglePlayCount } = request.body || {}

    if (typeof jinglePlayEvery !== 'number' || typeof jinglePlayCount !== 'number') {
      return reply.code(400).send({ error: 'invalid_input', message: 'jinglePlayEvery y jinglePlayCount son requeridos (números)' })
    }

    await pool.query(
      `UPDATE radio_streams SET jinglePlayEvery = ?, jinglePlayCount = ?, updatedAt = NOW() WHERE clientId = ?`,
      [Math.max(1, jinglePlayEvery), Math.max(1, jinglePlayCount), clientId]
    )

    try {
      await restartStream(clientId)
    } catch (err) {
      logger.warn({ err, clientId }, 'No se pudo reiniciar stream tras cambiar config de jingles')
    }

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'jingle_config', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ jinglePlayEvery, jinglePlayCount })]
    )

    logger.info({ clientId, jinglePlayEvery, jinglePlayCount }, 'Jingle config updated')
    return { ok: true, jinglePlayEvery, jinglePlayCount }
  })

  /**
   * GET /api/streams/:clientId/jingles/:jingleId/audio
   * Sirve el archivo MP3 para previsualización.
   */
  app.get('/api/streams/:clientId/jingles/:jingleId/audio', async (request, reply) => {
    const { clientId, jingleId } = request.params

    const [rows] = await pool.query(
      `SELECT filePath, mimeType FROM jingles WHERE id = ? AND clientId = ?`,
      [jingleId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    const { filePath, mimeType } = rows[0]
    if (!existsSync(filePath)) {
      return reply.code(404).send({ error: 'file_not_found' })
    }

    const stats = await stat(filePath)
    const mime = mimeType || 'audio/mpeg'
    reply.header('Content-Type', mime)
    reply.header('Content-Length', stats.size.toString())
    reply.header('Accept-Ranges', 'bytes')
    return reply.send(createReadStream(filePath))
  })
}
