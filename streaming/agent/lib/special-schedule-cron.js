// =====================================================
// Cron liviano: al cambiar la vigencia de un especial,
// regenera el playlist.m3u (Liquidsoap lo recarga solo).
// =====================================================

import { pool } from './db.js'
import { regenerateM3u } from './liquidsoap.js'
import { logger } from './logger.js'
import { isSpecialInWindow, todayInTimezone } from './special-schedule.js'

let timer = null
const signatures = new Map()

async function loadActiveSpecials() {
  const [rows] = await pool.query(
    `SELECT rs.id, rs.clientId, rs.startDate, rs.endDate, c.timezone
       FROM radio_specials rs
       JOIN clients c ON c.id = rs.clientId
      WHERE rs.active = 1`
  )
  const byClient = new Map()
  for (const row of rows) {
    if (!byClient.has(row.clientId)) {
      byClient.set(row.clientId, { timezone: row.timezone, ids: [] })
    }
    const bucket = byClient.get(row.clientId)
    if (isSpecialInWindow(row, todayInTimezone(bucket.timezone))) {
      bucket.ids.push(row.id)
    }
  }
  return byClient
}

async function tick() {
  try {
    const byClient = await loadActiveSpecials()
    for (const [clientId, bucket] of byClient) {
      const signature = bucket.ids.sort().join(',')
      const previous = signatures.get(clientId)
      signatures.set(clientId, signature)
      if (previous !== undefined && previous !== signature) {
        await regenerateM3u(clientId)
        logger.info({ clientId, activeSpecials: bucket.ids.length }, 'Vigencia de especiales cambió; m3u regenerado')
      }
    }
    for (const clientId of signatures.keys()) {
      if (!byClient.has(clientId)) signatures.delete(clientId)
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'No se pudo revisar la vigencia de especiales')
  }
}

export function startSpecialScheduleCron(intervalMs = 5 * 60 * 1000) {
  if (timer) return
  void tick()
  timer = setInterval(() => { void tick() }, intervalMs)
  timer.unref?.()
  logger.info({ intervalMs }, 'Cron de vigencia de especiales iniciado')
}

export function stopSpecialScheduleCron() {
  if (timer) clearInterval(timer)
  timer = null
}
