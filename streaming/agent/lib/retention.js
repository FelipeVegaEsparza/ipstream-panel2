// =====================================================
// Retention — limpieza periódica de tablas de auditoría
// =====================================================

import { pool } from './db.js'
import { logger } from './logger.js'

// Retener datos por 90 días por defecto
const DEFAULT_RETENTION_DAYS = 90
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // una vez al día

let intervalHandle = null

export function startRetentionCron() {
  if (intervalHandle) return
  logger.info(`Retention cron iniciado (${DEFAULT_RETENTION_DAYS} días)`)
  intervalHandle = setInterval(runRetention, CHECK_INTERVAL_MS)
  // Primera ejecución en background
  runRetention().catch((err) => logger.error({ err }, 'Retention inicial falló'))
}

export function stopRetentionCron() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

async function runRetention() {
  try {
    const tables = [
      { name: 'stream_stats', dateColumn: 'timestamp' },
      { name: 'play_history', dateColumn: 'playedAt' },
      { name: 'streaming_audit_logs', dateColumn: 'createdAt' },
    ]

    for (const { name, dateColumn } of tables) {
      try {
        const [result] = await pool.query(
          `DELETE FROM ${name} WHERE ${dateColumn} < NOW() - INTERVAL ? DAY`,
          [DEFAULT_RETENTION_DAYS]
        )
        logger.info({ table: name, deleted: result.affectedRows }, 'Retention cleanup')
      } catch (err) {
        logger.warn({ err: err.message, table: name }, 'Error en retention de tabla')
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error en retention cron')
  }
}
