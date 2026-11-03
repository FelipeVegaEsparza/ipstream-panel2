// =====================================================
// AI reviews del AutoDJ (fuente separada de intros)
// =====================================================

import { logger } from '../lib/logger.js'
import { saveAiReview, clearAiReviews, listAiReviewFiles, isSafeFileName } from '../lib/files.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import { sanitizeFileName, isMp3 } from '../lib/id3.js'
import { pool } from '../lib/db.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export default async function aiReviewRoutes(app) {
  app.delete('/api/streams/:clientId/ai-reviews', async (request) => {
    const { clientId } = request.params
    await clearAiReviews(clientId)
    await regenerateM3u(clientId)
    logger.info({ clientId }, 'AI reviews eliminadas')
    return { ok: true, reviewCount: 0 }
  })

  app.post('/api/streams/:clientId/ai-reviews/upload', async (request, reply) => {
    const { clientId } = request.params
    const [rsRows] = await pool.query(`SELECT id FROM radio_streams WHERE clientId = ?`, [clientId])
    if (rsRows.length === 0) return reply.code(404).send({ error: 'radio_stream_not_found' })

    let fileName = null
    try {
      const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE }, throwFileSizeLimit: false })
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
      const { size } = await saveAiReview(clientId, fileName, buffer)
      const result = await regenerateM3u(clientId)
      logger.info({ clientId, fileName, size }, 'AI review guardada')
      return { ok: true, fileName, size, ...result }
    } catch (err) {
      logger.error({ err, clientId, fileName }, 'Error guardando AI review')
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  app.get('/api/streams/:clientId/ai-reviews', async (request) => {
    const { clientId } = request.params
    const files = await listAiReviewFiles(clientId)
    return { count: files.length, files }
  })
}
