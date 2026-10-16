// =====================================================
// Retention — limpieza periódica de tablas de auditoría
// =====================================================

import { pool } from './db.js'
import { logger } from './logger.js'
import { RETENTION_PLAN } from './retention-plan.js'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // una vez al día

let intervalHandle = null

export function startRetentionCron() {
  if (intervalHandle) return
  logger.info('Retention cron iniciado')
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
  for (const { name, dateColumn, days } of RETENTION_PLAN) {
    try {
      const [result] = await pool.query(
        `DELETE FROM ${name} WHERE ${dateColumn} < NOW() - INTERVAL ? DAY`,
        [days]
      )
      if (result.affectedRows > 0) {
        logger.info({ table: name, deleted: result.affectedRows, days }, 'Retention cleanup')
      }
    } catch (err) {
      logger.warn({ err: err.message, table: name }, 'Error en retention de tabla')
    }
  }
}
