import { pool } from '../lib/db.js'
import { getMountStatus } from '../lib/icecast.js'
import { logger } from '../lib/logger.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

const COLLECTION_INTERVAL_MS = 5 * 60 * 1000

let collectionTimer = null

export function startStatsCron() {
  collectSnapshot()
  collectionTimer = setInterval(collectSnapshot, COLLECTION_INTERVAL_MS)
  logger.info(`Stats collection cron iniciado (cada ${COLLECTION_INTERVAL_MS / 1000}s)`)
}

export function stopStatsCron() {
  if (collectionTimer) {
    clearInterval(collectionTimer)
    collectionTimer = null
  }
}

async function collectSnapshot() {
  try {
    const [streams] = await pool.query(
      `SELECT id, clientId, icecastMount, status FROM radio_streams WHERE enabled = 1 AND status != 'off'`
    )
    for (const rs of streams) {
      try {
        const mount = await getMountStatus(rs.icecastMount)
        if (!mount) continue
        const listenerCount = mount.listeners ?? 0
        const listenerPeak = mount.listener_peak ?? 0
        const currentTitle = mount.title?.slice(0, 191) ?? null
        const currentArtist = mount.server_name?.slice(0, 191) ?? null
        await pool.query(
          `INSERT INTO stream_stats (id, clientId, radioStreamId, listenerCount, listenerPeak, currentTitle, currentArtist, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [uuid(), rs.clientId, rs.id, listenerCount, listenerPeak, currentTitle, currentArtist]
        )
      } catch (err) {
        logger.warn({ err: err.message, clientId: rs.clientId }, 'Error recolectando stats del stream')
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error en ciclo de colección de stats')
  }
}

export default async function statsRoutes(app) {

  app.get('/api/streams/:clientId/stats', async (request, reply) => {
    try {
      const { clientId } = request.params
      const { period = 'day', from, to } = request.query

      const now = new Date()
      let fromDate, toDate

      if (from && to) {
        fromDate = new Date(from)
        toDate = new Date(to)
      } else {
        toDate = now
        switch (period) {
          case 'week':
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }

      const [rows] = await pool.query(
        `SELECT
          DATE(timestamp) AS date,
          COUNT(*) AS snapshots,
          ROUND(AVG(listenerCount), 1) AS avgListeners,
          MAX(listenerPeak) AS peakListeners
         FROM stream_stats
         WHERE clientId = ?
           AND timestamp >= ?
           AND timestamp <= ?
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`,
        [clientId, fromDate, toDate]
      )

      const [allTimePeak] = await pool.query(
        `SELECT MAX(listenerPeak) AS allTimePeak FROM stream_stats WHERE clientId = ?`,
        [clientId]
      )

      const [totals] = await pool.query(
        `SELECT
          COUNT(*) AS totalSnapshots,
          ROUND(AVG(listenerCount), 1) AS overallAvg
         FROM stream_stats
         WHERE clientId = ?
           AND timestamp >= ?
           AND timestamp <= ?`,
        [clientId, fromDate, toDate]
      )

      return {
        period,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        summary: {
          overallAvgListeners: totals[0]?.overallAvg ?? 0,
          allTimePeakListeners: allTimePeak[0]?.allTimePeak ?? 0,
          totalSnapshots: totals[0]?.totalSnapshots ?? 0,
        },
        daily: rows,
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Error obteniendo stats')
      return reply.status(500).send({ error: 'stats_error', message: err.message })
    }
  })
}
