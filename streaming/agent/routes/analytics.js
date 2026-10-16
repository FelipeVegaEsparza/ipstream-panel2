// =====================================================
// Analytics — rutas internas (invocadas por el panel)
// =====================================================

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { recomputeDailyForClient } from '../lib/analytics/rollups.js'

export default async function analyticsRoutes(app) {
  // Recalcula los rollups diarios de un cliente (p. ej. al cambiar su zona horaria).
  app.post('/api/analytics/recompute-daily', async (request, reply) => {
    const clientId = request.body?.clientId
    if (!clientId || typeof clientId !== 'string') {
      return reply.code(400).send({ error: 'clientId_required' })
    }
    try {
      const [rows] = await pool.query('SELECT timezone FROM clients WHERE id = ? LIMIT 1', [clientId])
      const tz = rows[0]?.timezone || 'UTC'
      const result = await recomputeDailyForClient(clientId, tz)
      return { ok: true, ...result }
    } catch (err) {
      logger.error({ err: err.message, clientId }, 'Error recomputando analytics diarios')
      return reply.code(500).send({ error: 'recompute_error', message: err.message })
    }
  })
}
