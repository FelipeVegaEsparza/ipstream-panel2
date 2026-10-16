// =====================================================
// Analytics — recolección (DB + logs de Caddy)
// =====================================================

import crypto from 'crypto'
import { pool } from '../db.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import { getMountStatus } from '../icecast.js'
import { resolveSelfServerId } from '../self-server.js'
import { countVideoViewers } from '../video-viewers.js'
import { execCmd } from '../video-encoder.js'
import { enrichSession } from './enrich.js'
import {
  getStreamKey,
  parseRadioSessions,
  parseViewerSessions,
  buildRadioSampleRow,
  buildViewerSampleRow,
} from './parse.js'

function uuid() {
  return crypto.randomUUID()
}

function chunks(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Scope por servidor propio: multi-nodo solo recolecta sus streams.
 */
async function selfScope() {
  const selfId = await resolveSelfServerId()
  if (selfId) return { clause: 'serverId = ?', params: [selfId] }
  return { clause: 'serverId IS NULL', params: [] }
}

// -----------------------------------------------------
// Muestras
// -----------------------------------------------------

async function insertRadioSamples(rows) {
  if (rows.length === 0) return 0
  const cols = '(id, clientId, radioStreamId, listeners, peak, online, bitrate, title, artist, timestamp)'
  let inserted = 0
  for (const chunk of chunks(rows, 100)) {
    const values = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap((r) => [
      r.id, r.clientId, r.radioStreamId, r.listeners, r.peak, r.online, r.bitrate, r.title, r.artist, r.timestamp,
    ])
    await pool.query(`INSERT INTO listener_samples ${cols} VALUES ${values}`, params)
    inserted += chunk.length
  }
  return inserted
}

async function insertViewerSamples(rows) {
  if (rows.length === 0) return 0
  const cols = '(id, clientId, videoStreamId, viewers, online, timestamp)'
  let inserted = 0
  for (const chunk of chunks(rows, 100)) {
    const values = chunk.map(() => '(?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap((r) => [r.id, r.clientId, r.videoStreamId, r.viewers, r.online, r.timestamp])
    await pool.query(`INSERT INTO viewer_samples ${cols} VALUES ${values}`, params)
    inserted += chunk.length
  }
  return inserted
}

/**
 * Muestrea todos los streams de radio habilitados del propio servidor.
 */
export async function collectRadioSamples() {
  try {
    const scope = await selfScope()
    const [rows] = await pool.query(
      `SELECT id, clientId, icecastMount, bitrate FROM radio_streams WHERE enabled = 1 AND ${scope.clause}`,
      scope.params
    )
    const now = new Date()
    const sampleRows = []
    for (const rs of rows) {
      let mount = null
      try {
        mount = await getMountStatus(rs.icecastMount)
      } catch (err) {
        logger.warn({ err: err.message, clientId: rs.clientId }, 'Error leyendo mount para muestra de radio')
      }
      sampleRows.push(buildRadioSampleRow(rs, mount, now))
    }
    const inserted = await insertRadioSamples(sampleRows)
    logger.debug({ inserted }, 'Muestras de radio recolectadas')
    return inserted
  } catch (err) {
    logger.error({ err: err.message }, 'Error recolectando muestras de radio')
    return 0
  }
}

/**
 * Muestrea todos los streams de video del propio servidor.
 */
export async function collectViewerSamples() {
  try {
    const scope = await selfScope()
    const [rows] = await pool.query(
      `SELECT id, clientId, status FROM video_streams WHERE ${scope.clause}`,
      scope.params
    )
    if (rows.length === 0) return 0

    let viewersByKey = {}
    try {
      viewersByKey = await countVideoViewers()
    } catch (err) {
      logger.warn({ err: err.message }, 'Error contando espectadores para muestra de TV')
    }

    const now = new Date()
    const sampleRows = rows.map((vs) =>
      buildViewerSampleRow(vs, viewersByKey[getStreamKey(vs.clientId)] || 0, now)
    )
    const inserted = await insertViewerSamples(sampleRows)
    logger.debug({ inserted }, 'Muestras de TV recolectadas')
    return inserted
  } catch (err) {
    logger.error({ err: err.message }, 'Error recolectando muestras de TV')
    return 0
  }
}

// -----------------------------------------------------
// Sesiones (access log de Caddy)
// -----------------------------------------------------

async function readCaddyLog(path) {
  try {
    const out = await execCmd(
      `docker exec ${config.analytics.caddyContainer} sh -c "tail -c ${config.analytics.tailBytes} '${path}' 2>/dev/null || true"`,
      { timeout: 20_000 }
    )
    return out ? out.split('\n') : []
  } catch (err) {
    logger.debug({ err: err.message, path }, 'No se pudo leer el access log de Caddy')
    return []
  }
}

async function insertSessions(table, rows, idField) {
  if (rows.length === 0) return 0
  const cols = `(id, clientId, ${idField}, ip, country, city, device, browser, userAgent, bytes, startedAt, durationSeconds, signature)`
  let inserted = 0
  for (const chunk of chunks(rows, 200)) {
    const values = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap((s) => {
      const e = enrichSession(s)
      return [
        uuid(), e.clientId, e.streamId, e.ip, e.country, e.city, e.device, e.browser,
        e.userAgent, e.bytes, e.startedAt, e.durationSeconds, e.signature,
      ]
    })
    const [res] = await pool.query(`INSERT IGNORE INTO ${table} ${cols} VALUES ${values}`, params)
    inserted += res.affectedRows || 0
  }
  return inserted
}

export async function collectRadioSessions() {
  try {
    const scope = await selfScope()
    const [rows] = await pool.query(
      `SELECT id, clientId, icecastMount FROM radio_streams WHERE enabled = 1 AND ${scope.clause}`,
      scope.params
    )
    if (rows.length === 0) return 0

    const mountMap = new Map()
    for (const r of rows) mountMap.set(String(r.icecastMount).replace(/^\//, ''), { clientId: r.clientId, radioStreamId: r.id })

    const lines = await readCaddyLog(config.analytics.radioLogPath)
    const sessions = parseRadioSessions(lines, mountMap)
    const inserted = await insertSessions('listener_sessions', sessions, 'radioStreamId')
    if (inserted > 0) logger.info({ inserted, parsed: sessions.length }, 'Sesiones de radio registradas')
    return inserted
  } catch (err) {
    logger.error({ err: err.message }, 'Error recolectando sesiones de radio')
    return 0
  }
}

export async function collectViewerSessions() {
  try {
    const scope = await selfScope()
    const [rows] = await pool.query(
      `SELECT id, clientId FROM video_streams WHERE ${scope.clause}`,
      scope.params
    )
    if (rows.length === 0) return 0

    const keyMap = new Map()
    for (const r of rows) keyMap.set(getStreamKey(r.clientId), { clientId: r.clientId, videoStreamId: r.id })

    const lines = await readCaddyLog(config.analytics.videoLogPath)
    const sessions = parseViewerSessions(lines, keyMap)
    const inserted = await insertSessions('viewer_sessions', sessions, 'videoStreamId')
    if (inserted > 0) logger.info({ inserted, parsed: sessions.length }, 'Sesiones de TV registradas')
    return inserted
  } catch (err) {
    logger.error({ err: err.message }, 'Error recolectando sesiones de TV')
    return 0
  }
}
