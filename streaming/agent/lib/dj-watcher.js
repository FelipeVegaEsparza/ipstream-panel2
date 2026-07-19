// =====================================================
// DJ Watcher — monitorea estado del DJ en vivo
// En la nueva arquitectura:
//   - Liquidsoap maneja el switch live/autodj via fallback()
//   - harbor callbacks (on_connect/on_disconnect) notifican
//     al agente via HTTP
//   - Este watcher es un respaldo: detecta si el callback
//     no llegó y sincroniza el estado en DB
// =====================================================

import { getMountStatus } from './icecast.js'
import { logger } from './logger.js'
import { _djActive } from '../routes/streams.js'
import { pool } from './db.js'

const CHECK_INTERVAL = 30_000
let intervalHandle = null

export function startDjWatcher() {
  if (intervalHandle) return
  logger.info('DJ Watcher iniciado (respaldo)')
  intervalHandle = setInterval(checkMounts, CHECK_INTERVAL)
}

export function stopDjWatcher() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function checkMounts() {
  for (const mount of _djActive) {
    try {
      // Verificar si el mount existe en Icecast
      const currentMount = await getMountStatus(mount)
      if (currentMount && currentMount.listeners > 0) {
        // DJ sigue activo — ok
        continue
      }

      // El DJ se fue — sincronizar estado
      if (!currentMount) {
        logger.info({ mount }, 'DJ Watcher: DJ ya no está en Icecast, sincronizando estado')
      }

      const [rows] = await pool.query(
        `SELECT clientId, status FROM radio_streams WHERE icecastMount = ? LIMIT 1`,
        [mount]
      )
      if (rows.length === 0) {
        _djActive.delete(mount)
        continue
      }

      const { clientId, status } = rows[0]
      if (status === 'live') {
        // Callback de disconnect no llegó — actualizar
        await pool.query(
          `UPDATE radio_streams SET status = 'autodj', updatedAt = NOW() WHERE clientId = ?`,
          [clientId]
        )
        await pool.query(
          `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
           VALUES (UUID(), ?, 'dj_watcher_recovery', ?, NOW())`,
          [clientId, JSON.stringify({ mount, previousStatus: status })]
        )
        logger.info({ mount, clientId }, 'DJ Watcher: estado corregido a autodj')
      }

      _djActive.delete(mount)
    } catch (err) {
      logger.warn({ mount, err: err.message }, 'DJ Watcher: error en check')
    }
  }
}
