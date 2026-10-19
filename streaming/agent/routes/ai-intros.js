// =====================================================
// AI intros del presentador del AutoDJ (fuente separada de jingles)
// =====================================================

import { logger } from '../lib/logger.js'
import { saveAiIntro, clearAiIntros, listAiIntroFiles, isSafeFileName } from '../lib/files.js'
import { regenerateAiIntrosM3u } from '../lib/liquidsoap.js'
import { sanitizeFileName, isMp3 } from '../lib/id3.js'
import { pool } from '../lib/db.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export default async function aiIntroRoutes(app) {
  app.delete('/api/streams/:clientId/ai-intros', async (request, reply) => {
    const { clientId } = request.params
    await clearAiIntros(clientId)
    await regenerateAiIntrosM3u(clientId)
    logger.info({ clientId }, 'AI intros eliminadas')
    return { ok: true, introCount: 0 }
  })

  app.post('/api/streams/:clientId/ai-intros/upload', async (request, reply) => {
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
      const { size } = await saveAiIntro(clientId, fileName, buffer)
      const result = await regenerateAiIntrosM3u(clientId)
      logger.info({ clientId, fileName, size, introCount: result.introCount }, 'AI intro guardada')
      return { ok: true, fileName, size, ...result }
    } catch (err) {
      logger.error({ err, clientId, fileName }, 'Error guardando AI intro')
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  app.get('/api/streams/:clientId/ai-intros', async (request) => {
    const { clientId } = request.params
    const files = await listAiIntroFiles(clientId)
    return { count: files.length, files }
  })
}
