import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { readMetadata, fetchCoverFromMusicBrainz, sanitizeFileName, isMp3 } from '../lib/id3.js'
import { saveMp3, deleteMp3, saveCover, deleteCover, getCoverPath, isSafeFileName, ensureClientDir, mp3Path, uniqueFileName } from '../lib/files.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

const MAX_FILE_SIZE = 50 * 1024 * 1024

// Detecta si la columna coverUrl existe (migración ya aplicada)
let hasCoverColumn = false
let coverCheckDone = false

async function ensureCoverColumn() {
  if (coverCheckDone) return hasCoverColumn
  try {
    const [rows] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tracks' AND COLUMN_NAME = 'coverUrl'`
    )
    hasCoverColumn = rows.length > 0
  } catch {
    hasCoverColumn = false
  }
  coverCheckDone = true
  if (!hasCoverColumn) {
    logger.warn('Columna coverUrl no existe aún (migración pendiente)')
  }
  return hasCoverColumn
}

// Wrapper que retorna rows sin coverUrl si la columna no existe
async function queryTracks(clientId) {
  if (await ensureCoverColumn()) {
    const [rows] = await pool.query(
      `SELECT id, title, artist, album, duration, fileName, fileSize, coverUrl, folderId, mimeType, uploadedAt, updatedAt
       FROM tracks WHERE clientId = ? ORDER BY uploadedAt DESC`,
      [clientId]
    )
    return rows
  }
  const [rows] = await pool.query(
    `SELECT id, title, artist, album, duration, fileName, fileSize, folderId, mimeType, uploadedAt, updatedAt
     FROM tracks WHERE clientId = ? ORDER BY uploadedAt DESC`,
    [clientId]
  )
  return rows.map((r) => ({ ...r, coverUrl: null }))
}

// Wrapper que retorna track sin coverUrl si la columna no existe
async function queryTrackById(trackId, clientId) {
  if (await ensureCoverColumn()) {
    const [rows] = await pool.query(
      `SELECT id, fileName, artist, album, coverUrl FROM tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
    )
    return rows
  }
  const [rows] = await pool.query(
    `SELECT id, fileName, artist, album FROM tracks WHERE id = ? AND clientId = ?`,
    [trackId, clientId]
  )
  return rows.map((r) => ({ ...r, coverUrl: null }))
}

export default async function libraryRoutes(app) {
  app.get('/api/streams/:clientId/library', async (request, reply) => {
    const { clientId } = request.params
    const rows = await queryTracks(clientId)
    return { count: rows.length, tracks: rows }
  })

  app.post('/api/streams/:clientId/library/upload', async (request, reply) => {
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

      const { path: filePath, size } = await saveMp3(clientId, fileName, buffer)
      savedFileName = fileName

      const meta = await readMetadata(filePath)

      const trackId = 'trk_' + uuid().slice(0, 8)
      let coverUrl = null

      // Save embedded cover if present
      if (meta.coverBuffer) {
        await saveCover(clientId, trackId, meta.coverBuffer)
        coverUrl = `/api/dashboard/streaming/library/${trackId}/cover`
      }

      // Fallback: try MusicBrainz if we have artist+album but no embedded cover
      if (!meta.coverBuffer && meta.artist && meta.album) {
        try {
          const mbCover = await fetchCoverFromMusicBrainz(meta.artist, meta.album)
          if (mbCover) {
            await saveCover(clientId, trackId, mbCover.buffer)
            coverUrl = `/api/dashboard/streaming/library/${trackId}/cover`
          }
        } catch {}
      }

      // Insertar track — sin coverUrl si la columna no existe aún
      if (await ensureCoverColumn()) {
        await pool.query(
          `INSERT INTO tracks (id, clientId, radioStreamId, title, artist, album, duration,
            fileName, filePath, fileSize, coverUrl, mimeType, uploadedAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            trackId, clientId, radioStreamId,
            meta.title, meta.artist, meta.album, meta.duration,
            fileName, filePath, size, coverUrl, data.mimetype || 'audio/mpeg',
          ]
        )
      } else {
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
      }

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
          coverUrl,
          mimeType: data.mimetype || 'audio/mpeg',
        },
      }
    } catch (err) {
      logger.error({ err, clientId, savedFileName }, 'Error uploading track')
      if (savedFileName) {
        try { await deleteMp3(clientId, savedFileName) } catch {}
      }
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

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

    // If artist or album changed, try to fetch cover from MusicBrainz
    if ((typeof artist === 'string' || typeof album === 'string') && await ensureCoverColumn()) {
      const row = await queryTrackById(trackId, clientId)
      if (row.length > 0) {
        const t = row[0]
        if (t.artist || t.album) {
          try {
            const mbCover = await fetchCoverFromMusicBrainz(t.artist, t.album)
            if (mbCover) {
              await saveCover(clientId, trackId, mbCover.buffer)
              await pool.query(
                `UPDATE tracks SET coverUrl = ? WHERE id = ?`,
                [`/api/dashboard/streaming/library/${trackId}/cover`, trackId]
              )
            }
          } catch {}
        }
      }
    }

    return { ok: true }
  })

  app.delete('/api/streams/:clientId/library/:trackId', async (request, reply) => {
    const { clientId, trackId } = request.params

    const [rows] = await pool.query(
      `SELECT id, fileName FROM tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    const track = rows[0]

    if (isSafeFileName(track.fileName)) {
      try {
        await deleteMp3(clientId, track.fileName)
      } catch (err) {
        logger.warn({ err, trackId, fileName: track.fileName }, 'No se pudo borrar el archivo')
      }
    }

    // Delete cover art
    try {
      await deleteCover(clientId, trackId)
    } catch (err) {
      logger.warn({ err, trackId }, 'No se pudo borrar la carátula')
    }

    await pool.query(`DELETE FROM tracks WHERE id = ?`, [trackId])

    try { await regenerateM3u(clientId) } catch {}

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'track_delete', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ trackId, fileName: track.fileName })]
    )

    logger.info({ clientId, trackId, fileName: track.fileName }, 'Track deleted')
    return { ok: true }
  })

  /**
   * GET /api/streams/:clientId/library/:trackId/cover
   * Sirve la imagen de carátula del track.
   */
  app.get('/api/streams/:clientId/library/:trackId/cover', async (request, reply) => {
    const { clientId, trackId } = request.params
    const coverPath = getCoverPath(clientId, trackId)

    if (!existsSync(coverPath)) {
      return reply.code(404).send({ error: 'cover_not_found' })
    }

    const ext = coverPath.endsWith('.png') ? 'image/png' : 'image/jpeg'
    const image = await readFile(coverPath)
    return reply.type(ext).send(image)
  })

  /**
   * POST /api/streams/:clientId/library/:trackId/cover
   * Sube o reemplaza la carátula de un track.
   * Acepta multipart con campo "cover" (JPEG o PNG, max 2MB).
   */
  app.post('/api/streams/:clientId/library/:trackId/cover', async (request, reply) => {
    const { clientId, trackId } = request.params

    const [rows] = await pool.query(
      `SELECT id FROM tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
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

      await saveCover(clientId, trackId, buffer)
      const coverUrl = `/api/dashboard/streaming/library/${trackId}/cover`

      if (await ensureCoverColumn()) {
        await pool.query(
          `UPDATE tracks SET coverUrl = ?, updatedAt = NOW() WHERE id = ?`,
          [coverUrl, trackId]
        )
      }

      logger.info({ clientId, trackId }, 'Cover updated')
      return { ok: true, coverUrl }
    } catch (err) {
      logger.error({ err, clientId, trackId }, 'Error uploading cover')
      return reply.code(500).send({ error: 'cover_upload_failed', message: err.message })
    }
  })

  /**
   * DELETE /api/streams/:clientId/library/:trackId/cover
   * Elimina la carátula de un track.
   */
  app.delete('/api/streams/:clientId/library/:trackId/cover', async (request, reply) => {
    const { clientId, trackId } = request.params

    const [rows] = await pool.query(
      `SELECT id FROM tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    await deleteCover(clientId, trackId)

    if (await ensureCoverColumn()) {
      await pool.query(
        `UPDATE tracks SET coverUrl = NULL, updatedAt = NOW() WHERE id = ?`,
        [trackId]
      )
    }

    logger.info({ clientId, trackId }, 'Cover deleted')
    return { ok: true }
  })

  /**
   * GET /api/streams/:clientId/library/:trackId/audio
   * Sirve el archivo MP3 para previsualización.
   */
  app.get('/api/streams/:clientId/library/:trackId/audio', async (request, reply) => {
    const { clientId, trackId } = request.params

    const [rows] = await pool.query(
      `SELECT filePath, mimeType FROM tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
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

  /**
   * POST /api/streams/:clientId/library/covers/refresh
   * Corrige títulos "feos" (con prefijo timestamp de uniqueFileName) y busca
   * carátulas para los tracks que no tienen (carátula embebida re-leída o
   * MusicBrainz por artista). No toca tracks con carátula.
   */
  app.post('/api/streams/:clientId/library/covers/refresh', async (request, reply) => {
    const { clientId } = request.params

    // Tracks sin carátula + los que tienen título tipo "1234_nombre_sanitizado"
    const [rows] = await pool.query(
      `SELECT id, title, artist, album, fileName, filePath FROM tracks
       WHERE clientId = ? AND (coverUrl IS NULL OR coverUrl = '')`,
      [clientId]
    )

    let coversFound = 0
    let titlesFixed = 0

    for (const t of rows) {
      try {
        // 1) Corregir título derivado del archivo sanitizado (prefijo timestamp)
        const looksSanitized = /^\d+_/.test(t.title || '')
        if (looksSanitized) {
          const meta = await readMetadata(t.filePath)
          if (meta.title && meta.title !== t.title) {
            await pool.query(
              `UPDATE tracks SET title = ?, artist = COALESCE(?, artist), album = COALESCE(?, album), updatedAt = NOW() WHERE id = ?`,
              [meta.title, meta.artist, meta.album, t.id]
            )
            titlesFixed++
            t.title = meta.title
            t.artist = meta.artist || t.artist
            t.album = meta.album || t.album
          }
        }

        // 2) Carátula embebida (re-leer, por si el upload no la extrajo)
        const meta = await readMetadata(t.filePath)
        if (meta.coverBuffer) {
          await saveCover(clientId, t.id, meta.coverBuffer)
          await pool.query(
            `UPDATE tracks SET coverUrl = ? WHERE id = ?`,
            [`/api/dashboard/streaming/library/${t.id}/cover`, t.id]
          )
          coversFound++
          continue
        }

        // 3) MusicBrainz por artista (+álbum o título)
        if (t.artist) {
          const mb = await fetchCoverFromMusicBrainz(t.artist, t.album, t.title)
          if (mb) {
            await saveCover(clientId, t.id, mb.buffer)
            await pool.query(
              `UPDATE tracks SET coverUrl = ? WHERE id = ?`,
              [`/api/dashboard/streaming/library/${t.id}/cover`, t.id]
            )
            coversFound++
          }
        }
      } catch (err) {
        logger.warn({ err: err.message, trackId: t.id }, 'cover refresh: error por track')
      }
    }

    return { ok: true, scanned: rows.length, coversFound, titlesFixed }
  })
}
