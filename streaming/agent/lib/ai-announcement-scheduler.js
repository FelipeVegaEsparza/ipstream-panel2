// =====================================================
// Scheduler de locuciones de hora/clima para el AutoDJ
// Cada pocos segundos revisa los intervalos configurados. Cuando una locución
// está por vencer espera al final del tema, la genera para la hora exacta en
// que va a sonar y la empuja a la cola "announcements" de Liquidsoap.
// =====================================================

import { pool } from './db.js'
import { logger } from './logger.js'
import { generateAnnouncement } from './ai-announcer.js'
import { telnetCommand } from './liquidsoap-telnet.js'
import { getMountStatus } from './icecast.js'
import {
  LEAD_SECONDS,
  MIN_LEAD_SECONDS,
  PUSH_BEFORE_SECONDS,
  announcementTarget,
  estimateRemaining,
  parseRemaining,
} from './ai-announcement-timing.js'

const STALE_AFTER_MS = 5_000

let timer = null
const lastRun = new Map() // `${clientId}:${type}` -> timestamp
const pending = new Map() // clientId -> true mientras hay una locución en cola
const prepared = new Map() // clientId -> { type, path, targetMs }
const generating = new Set() // clientId mientras se genera el audio (evita duplicados)

function key(clientId, type) {
  return `${clientId}:${type}`
}

function isDue(mapKey, minutes) {
  if (!minutes || minutes <= 0) return false
  if (!lastRun.has(mapKey)) {
    lastRun.set(mapKey, Date.now())
    return false
  }
  return Date.now() - lastRun.get(mapKey) >= minutes * 60_000
}

async function telnetRemaining(port) {
  try {
    return parseRemaining(await telnetCommand(port, 'autodj.remaining'))
  } catch {
    return null
  }
}

/**
 * Fallback cuando Liquidsoap no puede calcular el remaining (p. ej. el
 * fallback del AutoDJ devuelve "inf"). Usa el inicio del tema que reporta
 * on_track y la duración del track/jingle que está sonando.
 */
async function dbRemaining(clientId, mount) {
  try {
    const [rsRows] = await pool.query(
      `SELECT currentTitle, currentTrackStartedAt
       FROM radio_streams WHERE clientId = ? LIMIT 1`,
      [clientId]
    )
    const rs = rsRows[0]
    if (!rs?.currentTrackStartedAt) return null

    // En AutoDJ la columna currentTitle puede no estar actualizada; Icecast
    // sí conoce el tema que está sonando en este momento.
    let currentTitle = rs.currentTitle
    if (mount) {
      try {
        const live = await getMountStatus(mount)
        if (live?.title) currentTitle = live.title
      } catch {}
    }
    if (!currentTitle) return null

    const startedMs = new Date(rs.currentTrackStartedAt).getTime()
    const title = String(currentTitle).toLowerCase()
    const [trackRows] = await pool.query(
      `SELECT t.title, t.duration
       FROM tracks t
       JOIN playlist_entries pe ON pe.trackId = t.id
       JOIN playlists p ON p.id = pe.playlistId
       WHERE p.clientId = ? AND p.isActive = 1`,
      [clientId]
    )
    let duration = null
    const match = trackRows.find(
      (t) => t.title && Number(t.duration) > 0 && title.includes(String(t.title).toLowerCase())
    )
    if (match) duration = Number(match.duration)

    if (!duration) {
      const [jingleRows] = await pool.query(
        `SELECT title, duration FROM jingles WHERE clientId = ?`,
        [clientId]
      )
      const jingle = jingleRows.find(
        (j) => j.title && Number(j.duration) > 0 && title.includes(String(j.title).toLowerCase())
      )
      if (jingle) duration = Number(jingle.duration)
    }

    if (!duration) return null
    return estimateRemaining(duration, startedMs)
  } catch {
    return null
  }
}

async function getRemaining(clientId, port, mount) {
  const telnet = await telnetRemaining(port)
  if (telnet != null) return { seconds: telnet, source: 'liquidsoap' }
  const db = await dbRemaining(clientId, mount)
  if (db != null) return { seconds: db, source: 'db' }
  return null
}

async function tick() {
  let rows = []
  try {
    ;[rows] = await pool.query(
      `SELECT clientId, icecastMount, liquidsoapTelnetPort, status, liquidsoapRunning,
              aiTimeEveryMinutes, aiWeatherEveryMinutes
       FROM radio_streams
       WHERE enabled = 1 AND liquidsoapRunning = 1
         AND (aiTimeEveryMinutes > 0 OR aiWeatherEveryMinutes > 0)`
    )
  } catch (err) {
    logger.warn({ err: err.message }, 'AI scheduler: no se pudieron leer radio_streams')
    return
  }

  for (const row of rows) {
    if (row.status !== 'autodj') continue
    const clientId = row.clientId
    const port = row.liquidsoapTelnetPort
    if (!clientId || !port || pending.has(clientId) || generating.has(clientId)) continue

    const jobs = []
    if (isDue(key(clientId, 'time'), Number(row.aiTimeEveryMinutes))) {
      jobs.push({ type: 'time' })
    }
    if (isDue(key(clientId, 'weather'), Number(row.aiWeatherEveryMinutes))) {
      jobs.push({ type: 'weather' })
    }

    const job = jobs[0]
    const current = prepared.get(clientId)
    if (!job) {
      if (current) prepared.delete(clientId)
      continue
    }
    if (current && current.type !== job.type) prepared.delete(clientId)

    const timing = await getRemaining(clientId, port, row.icecastMount)
    if (!timing) continue
    const remaining = timing.seconds
    if (remaining > LEAD_SECONDS) continue

    const prep = prepared.get(clientId)
    // Si el tema está por terminar no alcanza a generarse para este corte:
    // se espera al siguiente tema para locutar la hora correcta.
    if (!prep && remaining < MIN_LEAD_SECONDS) continue
    if (prep) {
      if (Date.now() > prep.targetMs + STALE_AFTER_MS) {
        // Se perdió el corte; se regenerará para el próximo tema.
        prepared.delete(clientId)
        continue
      }
    } else {
      // La locución se prepara para el instante del corte, no para "ahora".
      const target = announcementTarget(remaining)
      generating.add(clientId)
      try {
        const result = await generateAnnouncement(clientId, job.type, { at: target })
        if (!result?.path) {
          lastRun.set(key(clientId, job.type), Date.now())
          continue
        }
        prepared.set(clientId, { type: job.type, path: result.path, targetMs: target.getTime() })
        logger.info(
          { clientId, type: job.type, cached: result.cached, remaining, source: timing.source, target: target.toISOString() },
          'Locución automática preparada para el corte'
        )
      } catch (err) {
        lastRun.set(key(clientId, job.type), Date.now())
        logger.warn({ clientId, type: job.type, err: err.message }, 'AI scheduler: no se pudo preparar')
      } finally {
        generating.delete(clientId)
      }
      continue
    }

    if (remaining > PUSH_BEFORE_SECONDS) continue

    try {
      await telnetCommand(port, `announcements.push ${prep.path}`)
      lastRun.set(key(clientId, job.type), Date.now())
      prepared.delete(clientId)
      pending.set(clientId, true)
      setTimeout(() => pending.delete(clientId), 120_000)
      logger.info(
        { clientId, type: job.type, path: prep.path, remaining, source: timing.source },
        'Locución automática encolada en el AutoDJ'
      )
      // Una locución por cliente: la otra espera al próximo chequeo.
      break
    } catch (err) {
      lastRun.set(key(clientId, job.type), Date.now())
      prepared.delete(clientId)
      logger.warn({ clientId, type: job.type, err: err.message }, 'AI scheduler: no se pudo encolar')
    }
  }
}

export function startAiAnnouncementScheduler() {
  if (timer) return
  // Arrancar los relojes en el momento del boot para no disparar todo de golpe.
  const now = Date.now()
  lastRun.set('__boot__', now)
  timer = setInterval(() => { void tick() }, 2_000)
  logger.info('AI announcement scheduler iniciado')
}

export function stopAiAnnouncementScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
