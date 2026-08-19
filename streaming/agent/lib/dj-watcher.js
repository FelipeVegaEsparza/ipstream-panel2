// =====================================================
// DJ Watcher — reconcilia estado del DJ entre Liquidsoap,
// el agente y la base de datos.
// En la arquitectura harbor:
//   - Liquidsoap maneja el switch live/autodj via fallback()
//   - harbor callbacks (on_connect/on_disconnect) notifican
//     al agente via HTTP
//   - Este watcher reconstruye y verifica el estado periódicamente
//     para detectar callbacks perdidos o estado desfasado tras
//     reinicios del agente.
// =====================================================

import { logger } from './logger.js'
import { _djActive, isAnyDjActive, rebuildDjState } from './dj-state.js'
import { pool } from './db.js'

const CHECK_INTERVAL = 30_000
let intervalHandle = null

export function startDjWatcher() {
  if (intervalHandle) return
  logger.info('DJ Watcher iniciado (reconciliación Liquidsoap ↔ Agente ↔ DB)')
  intervalHandle = setInterval(checkMounts, CHECK_INTERVAL)
}

export function stopDjWatcher() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function checkMounts() {
  // Reconstruir estado desde Liquidsoap para streams running
  const [runningRows] = await pool.query(
    `SELECT clientId, icecastMount, status FROM radio_streams WHERE liquidsoapRunning = 1`
  )

  for (const row of runningRows) {
    try {
      await rebuildDjState(row.clientId)
    } catch (err) {
      logger.warn({ clientId: row.clientId, err: err.message }, 'DJ Watcher: rebuildDjState falló')
    }
  }

  // Corregir inconsistencias entre _djActive y DB
  const [statusRows] = await pool.query(
    `SELECT clientId, icecastMount, status FROM radio_streams WHERE status IN ('live', 'autodj')`
  )

  for (const row of statusRows) {
    try {
      const { clientId, icecastMount, status } = row
      const anyActive = isAnyDjActive(icecastMount)

      if (status === 'live' && !anyActive) {
        logger.info({ mount: icecastMount, clientId }, 'DJ Watcher: live sin DJs — corrigiendo a autodj')
        await pool.query(
          `UPDATE radio_streams SET status = 'autodj', updatedAt = NOW() WHERE clientId = ?`,
          [clientId]
        )
        await logRecovery(clientId, icecastMount, 'live', 'autodj')
      } else if (status === 'autodj' && anyActive) {
        logger.info({ mount: icecastMount, clientId }, 'DJ Watcher: autodj con DJs activos — corrigiendo a live')
        await pool.query(
          `UPDATE radio_streams SET status = 'live', lastError = NULL, updatedAt = NOW() WHERE clientId = ?`,
          [clientId]
        )
        await logRecovery(clientId, icecastMount, 'autodj', 'live')
      }
    } catch (err) {
      logger.warn({ mount: row.icecastMount, err: err.message }, 'DJ Watcher: error en check')
    }
  }
}

async function logRecovery(clientId, mount, previousStatus, newStatus) {
  await pool.query(
    `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
     VALUES (UUID(), ?, 'dj_watcher_recovery', ?, NOW())`,
    [clientId, JSON.stringify({ mount, previousStatus, newStatus })]
  )
}
