// =====================================================
// DJ Watcher — monitorea estado del DJ en vivo
// En la arquitectura harbor:
//   - Liquidsoap maneja el switch live/autodj via fallback()
//   - harbor callbacks (on_connect/on_disconnect) notifican
//     al agente via HTTP (fuente de verdad para _djActive)
//   - Este watcher es un respaldo SOLO para detectar estados
//     inconsistentes en DB (status='live' sin harbor activo)
//
// IMPORTANTE: NO itera _djActive. Los callbacks de harbor
// son la fuente de verdad. El watcher solo revisa la DB
// para casos donde un callback de disconnect no llegó.
// =====================================================

import { logger } from './logger.js'
import { _djActive } from '../routes/streams.js'
import { pool } from './db.js'

const CHECK_INTERVAL = 30_000
let intervalHandle = null

export function startDjWatcher() {
  if (intervalHandle) return
  logger.info('DJ Watcher iniciado (respaldo solo para estados inconsistentes)')
  intervalHandle = setInterval(checkMounts, CHECK_INTERVAL)
}

export function stopDjWatcher() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function checkMounts() {
  // Buscar streams con status='live' que NO tengan harbor activo
  // Esto significa que el on_disconnect callback no llegó
  const [rows] = await pool.query(
    `SELECT clientId, icecastMount FROM radio_streams WHERE status = 'live'`
  )

  for (const row of rows) {
    try {
      const { clientId, icecastMount } = row
      const slots = _djActive.get(icecastMount)

      // Si hay slots activos en harbor, el DJ sigue conectado — ok
      if (slots && slots.size > 0) continue

      // No hay harbor activo pero DB dice 'live' → callback de disconnect perdido
      logger.info({ mount: icecastMount, clientId }, 'DJ Watcher: estado inconsistente — corrigiendo a autodj')

      await pool.query(
        `UPDATE radio_streams SET status = 'autodj', updatedAt = NOW() WHERE clientId = ?`,
        [clientId]
      )
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
         VALUES (UUID(), ?, 'dj_watcher_recovery', ?, NOW())`,
        [clientId, JSON.stringify({ mount: icecastMount, previousStatus: 'live' })]
      )

      logger.info({ mount: icecastMount, clientId }, 'DJ Watcher: estado corregido a autodj')
    } catch (err) {
      logger.warn({ mount: row.icecastMount, err: err.message }, 'DJ Watcher: error en check')
    }
  }
}
