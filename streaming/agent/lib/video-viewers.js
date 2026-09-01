// =====================================================
// Video viewers — espectadores HLS por streamKey
// =====================================================
// Lee el access log de Caddy y cuenta las IPs únicas que pidieron el
// manifiesto .m3u8 en la ventana reciente. Retorna { [streamKey]: n }.
// Lo usan /api/admin/streaming-status (monitor) y el status de video
// por cliente (/api/video/:clientId/status).

import { logger } from './logger.js'
import { execCmd } from './video-encoder.js'

const CADDY_CONTAINER = 'ipstream-caddy'
const CADDY_LOG = '/data/access.log'

// Caché con TTL para evitar un `docker exec` por cada request de status.
// Leer el log de Caddy (2MB + grep) arranca runc/containerd por cada
// llamada, y con el polling del dashboard (5s) y del monitor (10s) eso
// infla el load del host. Una lectura cada CACHE_TTL_MS es suficiente
// para el conteo de espectadores en la ventana reciente.
const CACHE_TTL_MS = 10000
let _cache = { at: 0, viewers: null }

export async function countVideoViewers(windowMs = 30000) {
  const now = Date.now()
  if (_cache.viewers !== null && now - _cache.at < CACHE_TTL_MS) {
    return _cache.viewers
  }

  const viewers = await readViewersFromLog(windowMs)
  _cache = { at: now, viewers }
  return viewers
}

async function readViewersFromLog(windowMs = 30000) {
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
