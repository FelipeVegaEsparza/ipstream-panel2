// =====================================================
// AI intros del presentador del AutoDJ.
// Se guardan por playlist (ai-intros/<playlistId>/) para que la parrilla
// horaria pueda cambiar de playlist sin perder las locuciones de la anterior.
// El set nuevo se arma en un staging y se promueve al final, sin dejar a la
// playlist activa sin locuciones mientras se genera.
// =====================================================

import { logger } from '../lib/logger.js'
import {
  saveAiIntro,
  clearAiIntros,
  listAiIntroFiles,
  promoteAiIntros,
  isSafeFileName,
} from '../lib/files.js'
import { regenerateAiIntrosM3u, regenerateM3u } from '../lib/liquidsoap.js'
import { sanitizeFileName, isMp3 } from '../lib/id3.js'
import { pool } from '../lib/db.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{1,64}$/

/** Devuelve `null` si no viene, `false` si es inválido o el id normalizado. */
function readPlaylistId(request) {
  const raw = request.query?.playlistId
  if (raw === undefined || raw === null || raw === '') return null
  const value = String(raw)
  return PLAYLIST_ID_RE.test(value) ? value : false
}

function readStaging(request) {
  const raw = request.query?.staging
  return raw === '1' || raw === 'true'
}

export default async function aiIntroRoutes(app) {
  app.delete('/api/streams/:clientId/ai-intros', async (request, reply) => {
    const { clientId } = request.params
    const playlistId = readPlaylistId(request)
    if (playlistId === false) {
      return reply.code(400).send({ error: 'invalid_playlist_id' })
    }
    const staging = readStaging(request)
    await clearAiIntros(clientId, { playlistId, staging })
    if (!playlistId) {
      await regenerateAiIntrosM3u(clientId)
      logger.info({ clientId }, 'AI intros eliminadas (set legacy)')
    } else {
      if (!staging) await regenerateM3u(clientId)
      logger.info({ clientId, playlistId, staging }, 'AI intros eliminadas')
    }
    return { ok: true, introCount: 0 }
  })

  app.post('/api/streams/:clientId/ai-intros/upload', async (request, reply) => {
    const { clientId } = request.params
    const playlistId = readPlaylistId(request)
    if (playlistId === false) {
      return reply.code(400).send({ error: 'invalid_playlist_id' })
    }
    const staging = readStaging(request)
    const [rsRows] = await pool.query(`SELECT id FROM radio_streams WHERE clientId = ?`, [clientId])
    if (rsRows.length === 0) return reply.code(404).send({ error: 'radio_stream_not_found' })

    let fileName = null
    try {
      const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE, throwFileSizeLimit: false } })
      if (!data) return reply.code(400).send({ error: 'no_file', message: 'Falta el campo "file"' })
      if (!isMp3(data.filename, data.mimetype)) {
        return reply.code(415).send({ error: 'unsupported_media_type', message: 'Solo se aceptan MP3' })
      }
      const buffer = await data.toBuffer()
      if (data.file.truncated || buffer.length > MAX_FILE_SIZE) {
        return reply.code(413).send({ error: 'file_too_large', message: `Máximo ${MAX_FILE_SIZE / 1024 / 1024} MB` })
      }
      fileName = sanitizeFileName(data.filename)
      if (!fileName.toLowerCase().endsWith('.mp3')) fileName += '.mp3'
      if (!isSafeFileName(fileName)) {
        return reply.code(400).send({ error: 'invalid_filename' })
      }
      const { size } = await saveAiIntro(clientId, fileName, buffer, { playlistId, staging })
      if (!playlistId) {
        // Compatibilidad con el set plano anterior.
        await regenerateAiIntrosM3u(clientId)
      }
      logger.info({ clientId, playlistId, staging, fileName, size }, 'AI intro guardada')
      return { ok: true, fileName, size }
    } catch (err) {
      logger.error({ err, clientId, playlistId, fileName }, 'Error guardando AI intro')
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  /**
   * Cierra la generación: reemplaza el set vigente de la playlist por el
   * staging y regenera el m3u. Se llama una sola vez, al terminar.
   */
  app.post('/api/streams/:clientId/ai-intros/promote', async (request, reply) => {
    const { clientId } = request.params
    const playlistId = readPlaylistId(request)
    if (!playlistId) {
      return reply.code(400).send({ error: 'playlist_id_required' })
    }
    try {
      const promoted = await promoteAiIntros(clientId, playlistId)
      if (!promoted) {
        return reply.code(404).send({ error: 'staging_not_found' })
      }
      const files = await listAiIntroFiles(clientId, { playlistId })
      await regenerateM3u(clientId)
      logger.info({ clientId, playlistId, introCount: files.length }, 'Set de AI intros promovido')
      return { ok: true, introCount: files.length }
    } catch (err) {
      logger.error({ err, clientId, playlistId }, 'Error promoviendo AI intros')
      return reply.code(500).send({ error: 'promote_failed', message: err.message })
    }
  })

  app.get('/api/streams/:clientId/ai-intros', async (request, reply) => {
    const { clientId } = request.params
    const playlistId = readPlaylistId(request)
    if (playlistId === false) {
      return reply.code(400).send({ error: 'invalid_playlist_id' })
    }
    const files = await listAiIntroFiles(clientId, { playlistId })
    return { count: files.length, files, playlistId }
  })
}
