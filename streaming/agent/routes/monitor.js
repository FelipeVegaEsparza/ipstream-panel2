// =====================================================
// Routes — Monitor (estado del host + streaming en vivo)
// =====================================================
// Endpoints usados por el panel de monitoreo de /admin/monitor.
// El agente corre en el host y ya usa docker exec, así que puede leer la
// carga real del VPS y el access log de Caddy (para contar espectadores HLS).

import { logger } from '../lib/logger.js'
import { pool } from '../lib/db.js'
import { getMountStatus } from '../lib/icecast.js'
import { execCmd } from '../lib/video-encoder.js'
import crypto from 'crypto'
import fs from 'fs'

const CADDY_CONTAINER = 'ipstream-caddy'
const CADDY_LOG = '/data/access.log'

// El agente monta /proc y / del host (read-only) en /host/proc y /hostroot
// para poder leer la carga real del VPS en el panel de monitoreo.
const HOST_PROC = '/host/proc'
const HOST_ROOT = '/hostroot'

function getStreamKey(clientId) {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

/** Lee un archivo del host (montado en /host/proc o /hostroot), o null. */
function readHostFile(path) {
  try {
    return fs.readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

/**
 * Lee la carga real del host (no la del contenedor).
 * El agente monta /proc y / del host en /host/proc y /hostroot (read-only).
 */
async function readHostStats() {
  const out = {}

  // Load average
  const loadAvgRaw = readHostFile(`${HOST_PROC}/loadavg`)
  if (loadAvgRaw) {
    const parts = loadAvgRaw.trim().split(/\s+/)
    out.loadAvg = {
      one: parseFloat(parts[0]) || 0,
      five: parseFloat(parts[1]) || 0,
      fifteen: parseFloat(parts[2]) || 0,
    }
  }

  // CPUs del host (para calcular % de carga relativa)
  const cpuInfo = readHostFile(`${HOST_PROC}/cpuinfo`)
  out.cpuCount = (cpuInfo?.match(/^processor\s*:/gm) || []).length || 1

  // Memoria
  const memInfo = readHostFile(`${HOST_PROC}/meminfo`)
  if (memInfo) {
    const parseKB = (key) => {
      const m = memInfo.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
      return m ? Math.round(parseInt(m[1], 10) / 1024) : 0
    }
    const memTotal = parseKB('MemTotal')
    // MemAvailable es la métrica real de RAM disponible del host
    const memAvail = parseKB('MemAvailable')
    const memUsed = memTotal - memAvail
    out.memory = {
      totalMB: memTotal,
      freeMB: Math.max(0, memAvail),
      usedMB: Math.max(0, memUsed),
      percentUsed: memTotal ? Math.round((memUsed / memTotal) * 100) : 0,
    }
  }

  // Disco de la raíz del host
  const df = readHostFile(`${HOST_PROC}/mounts`)
  // df del host raíz: usamos statfs de /hostroot vía fs.statfs si está disponible
  try {
    const statfs = fs.statfsSync(HOST_ROOT)
    const totalKB = Math.round((statfs.blocks * statfs.bsize) / 1024)
    const freeKB = Math.round((statfs.bavail * statfs.bsize) / 1024)
    const usedKB = totalKB - freeKB
    out.disk = {
      totalMB: Math.round(totalKB / 1024),
      usedMB: Math.round(usedKB / 1024),
      freeMB: Math.round(freeKB / 1024),
      percentUsed: totalKB ? Math.round((usedKB / totalKB) * 100) : 0,
    }
  } catch {
    // fallback: df vía exec si statfs no está disponible
    try {
      const dfRaw = await execCmd(`df -P /hostroot | tail -1`).catch(() => null)
      if (dfRaw) {
        const parts = dfRaw.trim().split(/\s+/)
        if (parts.length >= 4) {
          const totalKB = parseInt(parts[1], 10) || 0
          const usedKB = parseInt(parts[2], 10) || 0
          out.disk = {
            totalMB: Math.round(totalKB / 1024),
            usedMB: Math.round(usedKB / 1024),
            freeMB: Math.round((totalKB - usedKB) / 1024),
            percentUsed: totalKB ? Math.round((usedKB / totalKB) * 100) : 0,
          }
        }
      }
    } catch {}
  }

  // Uptime del host
  const upRaw = readHostFile(`${HOST_PROC}/uptime`)
  if (upRaw) {
    const secs = parseFloat(upRaw.trim().split(/\s+/)[0]) || 0
    out.uptime = Math.round(secs)
  }

  // Contenedores activos
  const containers = await execCmd(`docker ps -q | wc -l`).catch(() => null)
  out.containers = parseInt((containers || '0').trim(), 10) || 0

  return out
}

/**
 * Cuenta espectadores de video (HLS) por streamKey.
 * Lee el access log de Caddy y cuenta las IPs únicas que pidieron el
 * manifiesto .m3u8 en la ventana reciente.
 * Retorna: { [streamKey]: n }
 */
async function countVideoViewers(windowMs = 30000) {
  const viewers = {}
  try {
    const log = await execCmd(
      `docker exec ${CADDY_CONTAINER} sh -c "tail -c 2000000 ${CADDY_LOG} 2>/dev/null | grep m3u8 || true"`
    ).catch(() => null)
    if (!log) return viewers

    const cutoff = Date.now() - windowMs
    const lines = log.split('\n')

    for (const line of lines) {
      let entry
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }
      // Solo requests a manifiestos HLS
      const uri = entry?.request?.uri || ''
      const m = uri.match(/\/(live|dj)\/(tv_[a-f0-9]{12})\.m3u8/)
      if (!m) continue

      const streamKey = m[2]
      // Filtro por ventana temporal usando el ts del log (unix seconds)
      const ts = entry?.ts
      if (typeof ts === 'number' && ts * 1000 < cutoff) continue

      const ip = entry?.request?.remote_ip || entry?.request?.client_ip
      if (!ip) continue

      if (!viewers[streamKey]) viewers[streamKey] = new Set()
      viewers[streamKey].add(ip)
    }

    const result = {}
    for (const [key, ips] of Object.entries(viewers)) {
      result[key] = ips.size
    }
    return result
  } catch (err) {
    logger.error({ err: err.message }, 'Error contando espectadores de video')
    return {}
  }
}

export default async function monitorRoutes(app) {
  /**
   * GET /api/admin/host-stats
   * Carga real del host (CPU, RAM, disco, uptime, contenedores).
   */
  app.get('/api/admin/host-stats', async (_request, reply) => {
    try {
      const stats = await readHostStats()
      return stats
    } catch (err) {
      logger.error({ err: err.message }, 'Error leyendo host stats')
      return reply.code(500).send({ error: 'host_stats_error' })
    }
  })

  /**
   * GET /api/admin/streaming-status
   * Estado de streaming en vivo de todos los clientes:
   * radio (oyentes por mount) + video (espectadores por streamKey).
   */
  app.get('/api/admin/streaming-status', async (_request, reply) => {
    try {
      const [radios, videos] = await Promise.all([
        pool.query(`SELECT clientId, icecastMount, status FROM radio_streams WHERE icecastMount IS NOT NULL`),
        pool.query(`SELECT clientId, status FROM video_streams`),
      ])

      // Oyentes en vivo de radio (Icecast)
      const listenersByClient = {}
      for (const rs of radios[0] || []) {
        try {
          const mount = await getMountStatus(rs.icecastMount)
          listenersByClient[rs.clientId] = mount?.listeners ?? 0
        } catch {
          listenersByClient[rs.clientId] = 0
        }
      }

      // Espectadores de video (log de Caddy)
      const viewersByStreamKey = await countVideoViewers()
      const viewersByClient = {}
      for (const v of videos[0] || []) {
        const key = getStreamKey(v.clientId)
        viewersByClient[v.clientId] = viewersByStreamKey[key] || 0
      }

      return {
        radio: (radios[0] || []).map((rs) => ({
          clientId: rs.clientId,
          status: rs.status,
          listeners: listenersByClient[rs.clientId] ?? 0,
        })),
        video: (videos[0] || []).map((v) => ({
          clientId: v.clientId,
          status: v.status,
          viewers: viewersByClient[v.clientId] || 0,
        })),
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Error leyendo streaming status')
      return reply.code(500).send({ error: 'streaming_status_error' })
    }
  })
}
