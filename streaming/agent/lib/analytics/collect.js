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
  parseViewerEvents,
  buildRadioSampleRow,
  buildViewerSampleRow,
} from './parse.js'
import { ViewerSessionTracker } from './sessions.js'

const viewerSessionTracker = new ViewerSessionTracker({
  gapSeconds: config.analytics.tvSessionGapSeconds,
})

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

/**
 * Lee el tramo reciente del access log de Caddy. Exportado para poder testear
 * el manejo de maxBuffer y de errores sin depender del contenedor.
 *
 * `child_process.exec` tiene un maxBuffer de 1 MB por defecto; el tramo por
 * defecto es de 5 MB, así que sin esta opción la lectura fallaba siempre y el
 * error quedaba oculto en un log de debug.
 */
export async function readCaddyLog(path, run = execCmd) {
  const command = `docker exec ${config.analytics.caddyContainer} sh -c "tail -c ${config.analytics.tailBytes} '${path}'"`
  try {
    const out = await run(command, {
      timeout: 20_000,
      maxBuffer: Math.max(config.analytics.tailBytes * 2, 2 * 1024 * 1024),
    })
    return out ? out.split('\n') : []
  } catch (err) {
    // Una lectura vacía ya no se confunde con "no hubo sesiones": si el archivo
    // no existe o el contenedor no responde, queda una advertencia visible.
    logger.warn({ err: err.message, path }, 'No se pudo leer el access log de Caddy')
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

/**
 * Inserta o actualiza sesiones de TV. La firma es única por sesión; si el
 * mismo tramo se relee, se actualizan duración/bytes sin crear otra fila.
 */
async function upsertViewerSessions(rows) {
  if (rows.length === 0) return 0
  const cols = '(id, clientId, videoStreamId, ip, country, city, device, browser, userAgent, bytes, startedAt, durationSeconds, signature)'
  let affected = 0
  for (const chunk of chunks(rows, 200)) {
    const values = chunk.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap((s) => {
      const e = enrichSession(s)
      return [
        uuid(), e.clientId, e.streamId, e.ip, e.country, e.city, e.device, e.browser,
        e.userAgent, e.bytes, e.startedAt, e.durationSeconds, e.signature,
      ]
    })
    const [res] = await pool.query(
      `INSERT INTO viewer_sessions ${cols} VALUES ${values}
       ON DUPLICATE KEY UPDATE
         durationSeconds = GREATEST(durationSeconds, VALUES(durationSeconds)),
         bytes = GREATEST(bytes, VALUES(bytes)),
         userAgent = VALUES(userAgent)`,
      params
    )
    affected += res.affectedRows || 0
  }
  return affected
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
    const events = parseViewerEvents(lines, keyMap)
    const pending = new Map()
    for (const event of events) {
      const result = viewerSessionTracker.ingest(event)
      if (result.start) pending.set(result.start.signature, result.start)
      else if (result.update) pending.set(result.update.signature, result.update)
    }
    viewerSessionTracker.prune()

    const sessionRows = [...pending.values()].map((s) => ({
      clientId: s.clientId,
      streamId: s.streamId,
      ip: s.ip,
      userAgent: s.userAgent,
      bytes: s.bytes,
      startedAt: s.startedAt,
      durationSeconds: s.durationSeconds,
      signature: s.signature,
    }))
    const affected = await upsertViewerSessions(sessionRows)
    if (affected > 0) {
      logger.info(
        { affected, events: events.length, tracked: viewerSessionTracker.size },
        'Sesiones de TV registradas'
      )
    }
    return affected
  } catch (err) {
    logger.error({ err: err.message }, 'Error recolectando sesiones de TV')
    return 0
  }
}
