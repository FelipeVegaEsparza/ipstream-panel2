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
    if (!clientId || !port) continue

    const jobs = []
    if (isDue(key(clientId, 'time'), Number(row.aiTimeEveryMinutes))) {
      jobs.push({ type: 'time', minutes: Number(row.aiTimeEveryMinutes) })
    }
    if (isDue(key(clientId, 'weather'), Number(row.aiWeatherEveryMinutes))) {
      jobs.push({ type: 'weather', minutes: Number(row.aiWeatherEveryMinutes) })
    }

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
        logger.info(
          { clientId, type: job.type, cached: result.cached, path: result.path },
          'Locución automática encolada en el AutoDJ'
        )
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
  timer = setInterval(() => { void tick() }, 60_000)
  logger.info('AI announcement scheduler iniciado')
}

export function stopAiAnnouncementScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
