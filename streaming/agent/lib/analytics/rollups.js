// =====================================================
// Analytics — rollups horarios y diarios (DB)
// =====================================================

import { pool } from '../db.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import { computeHourlyRows, computeDailyRows } from './rollup.js'
import { floorToHourUtc } from './time-buckets.js'
import { RAW_RETENTION_DAYS } from '../retention-plan.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const SAMPLE_INTERVAL_SECONDS = Math.max(1, Math.round(config.analytics.sampleIntervalMs / 1000))
const HOURLY_LOOKBACK_HOURS = 4
// Recomputa todos los días dentro de la retención cruda para que metrics_daily
// esté completo en los rangos del dashboard (hasta 30 días).
const DAILY_LOOKBACK_DAYS = 31

// -----------------------------------------------------
// Fetchers
// -----------------------------------------------------

async function fetchRadioSamples(from, to, clientId = null) {
  const where = clientId ? 'AND clientId = ?' : ''
  const params = clientId ? [from, to, clientId] : [from, to]
  const [rows] = await pool.query(
    `SELECT clientId, listeners AS value, online, timestamp FROM listener_samples
     WHERE timestamp >= ? AND timestamp < ? ${where}`,
    params
  )
  return rows
}

async function fetchViewerSamples(from, to, clientId = null) {
  const where = clientId ? 'AND clientId = ?' : ''
  const params = clientId ? [from, to, clientId] : [from, to]
  const [rows] = await pool.query(
    `SELECT clientId, viewers AS value, online, timestamp FROM viewer_samples
     WHERE timestamp >= ? AND timestamp < ? ${where}`,
    params
  )
  return rows
}

async function fetchRadioSessions(from, to, clientId = null) {
  const where = clientId ? 'AND clientId = ?' : ''
  const params = clientId ? [from, to, clientId] : [from, to]
  const [rows] = await pool.query(
    `SELECT clientId, ip, startedAt FROM listener_sessions
     WHERE startedAt >= ? AND startedAt < ? ${where}`,
    params
  )
  return rows
}

async function fetchViewerSessions(from, to, clientId = null) {
  const where = clientId ? 'AND clientId = ?' : ''
  const params = clientId ? [from, to, clientId] : [from, to]
  const [rows] = await pool.query(
    `SELECT clientId, ip, startedAt FROM viewer_sessions
     WHERE startedAt >= ? AND startedAt < ? ${where}`,
    params
  )
  return rows
}

async function fetchClientTimezones() {
  const [rows] = await pool.query('SELECT id, timezone FROM clients')
  const map = new Map()
  for (const r of rows) map.set(r.id, r.timezone || 'UTC')
  return map
}

// -----------------------------------------------------
// Upserts
// -----------------------------------------------------

async function upsertHourly(service, rows) {
  if (rows.length === 0) return 0
  const cols = '(clientId, service, bucketStartUtc, listenersAvg, listenersMax, listenerMinutes, sessions, airtimeSeconds, uniqueListeners)'
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const values = chunk.map(() => '(?,?,?,?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap((r) => [
      r.clientId, service, r.bucketStartUtc, r.listenersAvg, r.listenersMax,
      r.listenerMinutes, r.sessions, r.airtimeSeconds, r.uniqueListeners,
    ])
    await pool.query(
      `INSERT INTO metrics_hourly ${cols} VALUES ${values}
       ON DUPLICATE KEY UPDATE
         listenersAvg = VALUES(listenersAvg),
         listenersMax = VALUES(listenersMax),
         listenerMinutes = VALUES(listenerMinutes),
         sessions = VALUES(sessions),
         airtimeSeconds = VALUES(airtimeSeconds),
         uniqueListeners = VALUES(uniqueListeners)`,
      params
    )
  }
  return rows.length
}

async function upsertDaily(service, rows) {
  if (rows.length === 0) return 0
  const cols = '(clientId, service, dayLocal, tz, listenersAvg, listenersMax, listenerMinutes, sessions, airtimeSeconds, uniqueListeners)'
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const values = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap((r) => [
      r.clientId, service, r.dayLocal, r.tz, r.listenersAvg, r.listenersMax,
      r.listenerMinutes, r.sessions, r.airtimeSeconds, r.uniqueListeners,
    ])
    await pool.query(
      `INSERT INTO metrics_daily ${cols} VALUES ${values}
       ON DUPLICATE KEY UPDATE
         tz = VALUES(tz),
         listenersAvg = VALUES(listenersAvg),
         listenersMax = VALUES(listenersMax),
         listenerMinutes = VALUES(listenerMinutes),
         sessions = VALUES(sessions),
         airtimeSeconds = VALUES(airtimeSeconds),
         uniqueListeners = VALUES(uniqueListeners)`,
      params
    )
  }
  return rows.length
}

// -----------------------------------------------------
// Rollup runners
// -----------------------------------------------------

function inRange(ts, from, to) {
  const t = ts instanceof Date ? ts.getTime() : new Date(ts).getTime()
  return t >= from.getTime() && t < to.getTime()
}

export async function runHourlyRollup() {
  try {
    const nowHour = floorToHourUtc(new Date())
    const from = new Date(nowHour.getTime() - (HOURLY_LOOKBACK_HOURS - 1) * HOUR_MS)
    const to = new Date(nowHour.getTime() + HOUR_MS)

    const [rSamples, vSamples, rSessions, vSessions] = await Promise.all([
      fetchRadioSamples(from, to),
      fetchViewerSamples(from, to),
      fetchRadioSessions(from, to),
      fetchViewerSessions(from, to),
    ])

    for (let h = 0; h < HOURLY_LOOKBACK_HOURS; h++) {
      const start = new Date(from.getTime() + h * HOUR_MS)
      const end = new Date(start.getTime() + HOUR_MS)

      const radioRows = computeHourlyRows({
        samples: rSamples.filter((s) => inRange(s.timestamp, start, end)),
        sessions: rSessions.filter((s) => inRange(s.startedAt, start, end)),
        intervalSeconds: SAMPLE_INTERVAL_SECONDS,
        bucketStartUtc: start,
      })
      const tvRows = computeHourlyRows({
        samples: vSamples.filter((s) => inRange(s.timestamp, start, end)),
        sessions: vSessions.filter((s) => inRange(s.startedAt, start, end)),
        intervalSeconds: SAMPLE_INTERVAL_SECONDS,
        bucketStartUtc: start,
      })

      await upsertHourly('radio', radioRows)
      await upsertHourly('tv', tvRows)
    }
    logger.debug('Rollup horario completado')
  } catch (err) {
    logger.error({ err: err.message }, 'Error en rollup horario')
  }
}

function dailyRowsPerClient(samples, sessions, tzById) {
  const byClient = new Map()
  for (const s of samples) {
    if (!byClient.has(s.clientId)) byClient.set(s.clientId, [])
    byClient.get(s.clientId).push(s)
  }
  const rows = []
  for (const [clientId, clientSamples] of byClient.entries()) {
    const tz = tzById.get(clientId) || 'UTC'
    const clientSessions = sessions.filter((s) => s.clientId === clientId)
    rows.push(...computeDailyRows({ samples: clientSamples, sessions: clientSessions, intervalSeconds: SAMPLE_INTERVAL_SECONDS, tz }))
  }
  return rows
}

export async function runDailyRollup() {
  try {
    const to = new Date()
    const from = new Date(to.getTime() - DAILY_LOOKBACK_DAYS * DAY_MS)
    const tzById = await fetchClientTimezones()

    const [rSamples, vSamples, rSessions, vSessions] = await Promise.all([
      fetchRadioSamples(from, to),
      fetchViewerSamples(from, to),
      fetchRadioSessions(from, to),
      fetchViewerSessions(from, to),
    ])

    const radioRows = dailyRowsPerClient(rSamples, rSessions, tzById)
    const tvRows = dailyRowsPerClient(vSamples, vSessions, tzById)
    await upsertDaily('radio', radioRows)
    await upsertDaily('tv', tvRows)
    logger.debug({ radio: radioRows.length, tv: tvRows.length }, 'Rollup diario completado')
  } catch (err) {
    logger.error({ err: err.message }, 'Error en rollup diario')
  }
}

/**
 * Recalcula todos los metrics_daily de un cliente (al cambiar su zona horaria).
 */
export async function recomputeDailyForClient(clientId, tz) {
  const to = new Date(Date.now() + DAY_MS)
  const from = new Date(Date.now() - RAW_RETENTION_DAYS * DAY_MS)
  const zone = tz || 'UTC'

  try {
    const [rSamples, vSamples, rSessions, vSessions] = await Promise.all([
      fetchRadioSamples(from, to, clientId),
      fetchViewerSamples(from, to, clientId),
      fetchRadioSessions(from, to, clientId),
      fetchViewerSessions(from, to, clientId),
    ])

    const radioRows = computeDailyRows({ samples: rSamples, sessions: rSessions, intervalSeconds: SAMPLE_INTERVAL_SECONDS, tz: zone })
    const tvRows = computeDailyRows({ samples: vSamples, sessions: vSessions, intervalSeconds: SAMPLE_INTERVAL_SECONDS, tz: zone })

    await pool.query('DELETE FROM metrics_daily WHERE clientId = ?', [clientId])
    await upsertDaily('radio', radioRows)
    await upsertDaily('tv', tvRows)
    logger.info({ clientId, tz: zone }, 'Analytics: metrics_daily recalculados por cambio de zona horaria')
    return { radio: radioRows.length, tv: tvRows.length }
  } catch (err) {
    logger.error({ err: err.message, clientId }, 'Error recalculando metrics_daily')
    throw err
  }
}
