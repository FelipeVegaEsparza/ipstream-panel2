// =====================================================
// Cápsulas de noticias: audio generado por el panel
// =====================================================

import { logger } from '../lib/logger.js'
import { saveNewsCapsuleAudio, clearNewsCapsuleAudio } from '../lib/files.js'
import { isMp3 } from '../lib/id3.js'
import { pool } from '../lib/db.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export default async function newsCapsuleRoutes(app) {
  app.post('/api/streams/:clientId/news-capsules/:capsuleId/upload', async (request, reply) => {
    const { clientId, capsuleId } = request.params
    const [rsRows] = await pool.query(`SELECT id FROM radio_streams WHERE clientId = ?`, [clientId])
    if (rsRows.length === 0) return reply.code(404).send({ error: 'radio_stream_not_found' })

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
      const { size } = await saveNewsCapsuleAudio(clientId, capsuleId, buffer)
      logger.info({ clientId, capsuleId, size }, 'Audio de cápsula de noticias guardado')
      return { ok: true, size }
    } catch (err) {
      logger.error({ err, clientId, capsuleId }, 'Error guardando audio de cápsula de noticias')
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  app.delete('/api/streams/:clientId/news-capsules/:capsuleId', async (request) => {
    const { clientId, capsuleId } = request.params
    await clearNewsCapsuleAudio(clientId, capsuleId)
    return { ok: true }
  })
}
