// =====================================================
// Scheduler de locuciones de hora/clima para el AutoDJ
// Cada minuto revisa los intervalos configurados y empuja el MP3 a la cola
// "announcements" de Liquidsoap. La cola se reproduce en el próximo corte.
// =====================================================

import { pool } from './db.js'
import { logger } from './logger.js'
import { generateAnnouncement } from './ai-announcer.js'
import { telnetCommand } from './liquidsoap-telnet.js'

let timer = null
const lastRun = new Map() // `${clientId}:${type}` -> timestamp
const pending = new Map() // clientId -> true mientras hay una locución esperando/reproduciéndose

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

async function getRemaining(port) {
  try {
    const raw = await telnetCommand(port, 'autodj.remaining')
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
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
    if (!clientId || !port || pending.has(clientId)) continue

    const jobs = []
    if (isDue(key(clientId, 'time'), Number(row.aiTimeEveryMinutes))) {
      jobs.push({ type: 'time', minutes: Number(row.aiTimeEveryMinutes) })
    }
    if (isDue(key(clientId, 'weather'), Number(row.aiWeatherEveryMinutes))) {
      jobs.push({ type: 'weather', minutes: Number(row.aiWeatherEveryMinutes) })
    }
    if (jobs.length === 0) continue

    // Generar cerca del final del tema para que la hora grabada sea la que
    // sonará. La cola de anuncios espera el corte de tema siguiente.
    const remaining = await getRemaining(port)
    if (remaining != null && remaining > 12) continue

    for (const job of jobs) {
      const mapKey = key(clientId, job.type)
      try {
        const result = await generateAnnouncement(clientId, job.type)
        if (!result?.path) {
          lastRun.set(mapKey, Date.now())
          continue
        }
        await telnetCommand(port, `announcements.push ${result.path}`)
        lastRun.set(mapKey, Date.now())
        pending.set(clientId, true)
        setTimeout(() => pending.delete(clientId), 120_000)
        logger.info(
          { clientId, type: job.type, cached: result.cached, path: result.path, remaining },
          'Locución automática encolada en el AutoDJ'
        )
        // Una locución por cliente: la otra espera al próximo chequeo.
        break
      } catch (err) {
        lastRun.set(mapKey, Date.now())
        logger.warn({ clientId, type: job.type, err: err.message }, 'AI scheduler: no se pudo encolar')
      }
    }
  }
}

export function startAiAnnouncementScheduler() {
  if (timer) return
  // Arrancar los relojes en el momento del boot para no disparar todo de golpe.
  const now = Date.now()
  lastRun.set('__boot__', now)
  timer = setInterval(() => { void tick() }, 5_000)
  logger.info('AI announcement scheduler iniciado')
}

export function stopAiAnnouncementScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
