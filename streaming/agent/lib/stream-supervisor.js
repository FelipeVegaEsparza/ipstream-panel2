// =====================================================
// Stream Supervisor — detecta streams muertos
// Revisa cada 60s que los streams marcados como running
// en DB realmente tengan un proceso Liquidsoap activo.
// Si no, loguea y marca el stream como off para que
// el operador/administrador pueda actuar.
// =====================================================

import { logger } from './logger.js'
import { pool } from './db.js'
import { isProcessRunning } from './liquidsoap.js'

const CHECK_INTERVAL_MS = 60_000
let intervalHandle = null

export function startStreamSupervisor() {
  if (intervalHandle) return
  logger.info('Stream supervisor iniciado (intervalo: 60s)')
  intervalHandle = setInterval(checkStreams, CHECK_INTERVAL_MS)
}

export function stopStreamSupervisor() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function checkStreams() {
  try {
    const [rows] = await pool.query(
      `SELECT clientId, icecastMount, status FROM radio_streams WHERE liquidsoapRunning = 1`
    )

    for (const row of rows) {
      try {
        const proc = await isProcessRunning(row.icecastMount)
        if (!proc.running) {
          logger.warn({ clientId: row.clientId, mount: row.icecastMount }, 'Stream supervisor: proceso no encontrado — marcando off')
          await pool.query(
            `UPDATE radio_streams SET liquidsoapRunning = 0, liquidsoapPid = NULL, status = 'off', lastError = ?, updatedAt = NOW() WHERE clientId = ?`,
            ['Proceso Liquidsoap no encontrado por el supervisor', row.clientId]
          )
          await pool.query(
            `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
             VALUES (UUID(), ?, 'supervisor_marked_off', ?, NOW())`,
            [row.clientId, JSON.stringify({ mount: row.icecastMount, previousStatus: row.status })]
          )
        }
      } catch (err) {
        logger.warn({ err: err.message, clientId: row.clientId }, 'Stream supervisor: error verificando stream')
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Stream supervisor: error general')
  }
}
