// =====================================================
// Analytics — funciones puras de parseo/construcción
// =====================================================
// Sin dependencias de DB ni de config, para poder testear.

import crypto from 'crypto'

/**
 * streamKey de un stream de video (idéntico al que usa el agente para SRS).
 */
export function getStreamKey(clientId) {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

/**
 * Extrae el mount (sin slash) de una URI de request.
 */
export function mountFromUri(uri) {
  if (!uri || typeof uri !== 'string') return null
  const path = uri.split('?')[0]
  return path.startsWith('/') ? path.slice(1) : path
}

/**
 * Firma idempotente para una sesión.
 */
export function makeSignature(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 64)
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== 'object') return null
  const lower = name.toLowerCase()
  const key = Object.keys(headers).find((h) => h.toLowerCase() === lower)
  if (!key) return null
  const v = headers[key]
  if (Array.isArray(v)) return v[0] ?? null
  return typeof v === 'string' ? v : null
}

/**
 * Separa artista y título de un string de Icecast ("Artista - Título").
 */
export function parseArtistFromTitle(title) {
  if (!title) return { title: null, artist: null }
  const separators = [' - ', ' – ', ' — ', '_-_', '_–_']
  for (const sep of separators) {
    const idx = title.indexOf(sep)
    if (idx > 0) {
      return {
        artist: title.slice(0, idx).trim() || null,
        title: title.slice(idx + sep.length).trim() || title.trim(),
      }
    }
  }
  return { title: title.trim(), artist: null }
}

/**
 * Construye la fila de muestra de radio. `mount` null => apagado.
 */
export function buildRadioSampleRow(rs, mount, now = new Date(), id = crypto.randomUUID()) {
  const online = !!mount
  const parsed = parseArtistFromTitle(online ? mount.title : null)
  return {
    id,
    clientId: rs.clientId,
    radioStreamId: rs.id,
    listeners: online ? (mount.listeners ?? 0) : 0,
    peak: online ? (mount.listener_peak ?? 0) : 0,
    online,
    bitrate: rs.bitrate ?? (online ? mount.bitrate ?? null : null),
    title: parsed.title ? parsed.title.slice(0, 191) : null,
    artist: parsed.artist ? parsed.artist.slice(0, 191) : null,
    timestamp: now,
  }
}

/**
 * Construye la fila de muestra de TV.
 */
export function buildViewerSampleRow(vs, viewers, now = new Date(), id = crypto.randomUUID()) {
  const online = !!vs.status && vs.status !== 'off'
  return {
    id,
    clientId: vs.clientId,
    videoStreamId: vs.id,
    viewers: online ? (viewers ?? 0) : 0,
    online,
    timestamp: now,
  }
}

const TV_MANIFEST_RE = /(?:^|\/)(?:live|dj)\/(tv_[a-f0-9]{12})\.m3u8/

/**
 * Parsea líneas del access log de Caddy (JSON) y devuelve sesiones de radio.
 * @param {string[]} lines
 * @param {Map<string,{clientId:string,radioStreamId:string}>} mountMap mount (sin slash) -> stream
 */
export function parseRadioSessions(lines, mountMap) {
  const out = []
  const seen = new Set()
  for (const line of lines) {
    if (!line) continue
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (!e || !e.request) continue
    const method = e.request.method
    if (method && method !== 'GET' && method !== 'HEAD') continue

    const mount = mountFromUri(e.request.uri)
    const target = mountMap.get(mount)
    if (!target) continue

    const ip = e.request.remote_ip || e.request.client_ip || null
    const ts = typeof e.ts === 'number' ? e.ts : null
    if (!ip || !ts) continue

    const duration = Number(e.duration ?? 0)
    const size = Number(e.size ?? 0)
    const signature = makeSignature([ts, ip, mount, size, Math.round(duration)])
    if (seen.has(signature)) continue
    seen.add(signature)

    out.push({
      clientId: target.clientId,
      streamId: target.radioStreamId,
      mount,
      ip,
      userAgent: headerValue(e.request.headers, 'User-Agent'),
      bytes: Number.isFinite(size) ? size : 0,
      startedAt: new Date(ts * 1000),
      durationSeconds: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
      signature,
    })
  }
  return out
}

/**
 * Parsea líneas del access log de Caddy (JSON) y devuelve sesiones de TV.
 * @param {string[]} lines
 * @param {Map<string,{clientId:string,videoStreamId:string}>} keyMap streamKey -> stream
 */
export function parseViewerSessions(lines, keyMap) {
  const out = []
  const seen = new Set()
  for (const line of lines) {
    if (!line) continue
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (!e || !e.request) continue

    const uri = e.request.uri || ''
    const m = uri.match(TV_MANIFEST_RE)
    if (!m) continue
    const streamKey = m[1]
    const target = keyMap.get(streamKey)
    if (!target) continue

    const ip = e.request.remote_ip || e.request.client_ip || null
    const ts = typeof e.ts === 'number' ? e.ts : null
    if (!ip || !ts) continue

    const duration = Number(e.duration ?? 0)
    const size = Number(e.size ?? 0)
    const signature = makeSignature([ts, ip, streamKey, size, Math.round(duration)])
    if (seen.has(signature)) continue
    seen.add(signature)

    out.push({
      clientId: target.clientId,
      streamId: target.videoStreamId,
      mount: streamKey,
      ip,
      userAgent: headerValue(e.request.headers, 'User-Agent'),
      bytes: Number.isFinite(size) ? size : 0,
      startedAt: new Date(ts * 1000),
      durationSeconds: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
      signature,
    })
  }
  return out
}
