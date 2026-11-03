// =====================================================
// Especiales: audio de intro/cierre subido por el panel
// =====================================================

import { logger } from '../lib/logger.js'
import { saveSpecialAudio, clearSpecialAudio } from '../lib/files.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import { isMp3 } from '../lib/id3.js'
import { pool } from '../lib/db.js'

const MAX_FILE_SIZE = 20 * 1024 * 1024

function parsePart(value) {
  return value === 'intro' || value === 'closing' ? value : null
}

export default async function specialRoutes(app) {
  app.post('/api/streams/:clientId/specials/:specialId/audio', async (request, reply) => {
    const { clientId, specialId } = request.params
    const part = parsePart(request.query?.part)
    if (!part) return reply.code(400).send({ error: 'invalid_part', message: 'part debe ser intro o closing' })

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

      const { size } = await saveSpecialAudio(clientId, specialId, part, buffer)
      const result = await regenerateM3u(clientId)
      logger.info({ clientId, specialId, part, size, ...result }, 'Audio de especial guardado')
      return { ok: true, part, size, ...result }
    } catch (err) {
      logger.error({ err, clientId, specialId, part }, 'Error guardando audio de especial')
      return reply.code(500).send({ error: 'upload_failed', message: err.message })
    }
  })

  app.delete('/api/streams/:clientId/specials/:specialId', async (request) => {
    const { clientId, specialId } = request.params
    await clearSpecialAudio(clientId, specialId)
    const result = await regenerateM3u(clientId)
    logger.info({ clientId, specialId, ...result }, 'Audio de especial eliminado')
    return { ok: true, ...result }
  })
}
