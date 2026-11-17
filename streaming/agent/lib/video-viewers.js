// =====================================================
// Video viewers — espectadores HLS por streamKey
// =====================================================
// Lee el access log de Caddy y cuenta las IPs únicas que pidieron el
// manifiesto .m3u8 en la ventana reciente. Retorna { [streamKey]: n }.
// Lo usan /api/admin/streaming-status (monitor) y el status de video
// por cliente (/api/video/:clientId/status).

import { logger } from './logger.js'
import { execCmd } from './video-encoder.js'
import { parseVideoPlaybackRequest } from './analytics/parse.js'

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

/**
 * Cuenta IPs únicas que reprodujeron cada stream en la ventana reciente.
 * Acepta `options.run` para testear el parseo y las opciones de exec sin
 * depender del contenedor de Caddy.
 */
export async function readViewersFromLog(windowMs = 30000, options = {}) {
  const viewers = {}
  const run = options.run || execCmd
  try {
    const log = await run(
      `docker exec ${CADDY_CONTAINER} sh -c "tail -c 2000000 ${CADDY_LOG} 2>/dev/null | grep -E 'm3u8|/seg/' || true"`,
      { maxBuffer: 4 * 1024 * 1024 }
    )
    if (!log) return viewers

    const cutoff = Date.now() - windowMs

    for (const line of log.split('\n')) {
      let entry
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }

      // Reproducción de TV: SRS en vivo o cualquier recurso de VOD2Live.
      const playback = parseVideoPlaybackRequest(entry?.request?.uri || '')
      if (!playback) continue

      // Filtro por ventana temporal usando el ts del log (unix seconds).
      const ts = entry?.ts
      if (typeof ts === 'number' && ts * 1000 < cutoff) continue

      const ip = entry?.request?.remote_ip || entry?.request?.client_ip
      if (!ip) continue

      if (!viewers[playback.streamKey]) viewers[playback.streamKey] = new Set()
      viewers[playback.streamKey].add(ip)
    }

    const result = {}
    for (const [key, ips] of Object.entries(viewers)) {
      result[key] = ips.size
    }
    return result
  } catch (err) {
    logger.warn({ err: err.message }, 'No se pudieron contar espectadores de video')
    return {}
  }
}
