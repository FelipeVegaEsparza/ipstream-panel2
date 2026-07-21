// =====================================================
// Track History — Video (Televisión)
// =====================================================
// Detecta cambios de track en la reproducción de video
// consultando SRS API o el estado interno del encoder.
//
// Análogo a track-history.js para radio, pero:
// - No hay metadata Icecast — SRS no provee track info
// - La detección se hace monitoreando qué archivo
//   está reproduciendo FFmpeg actualmente
// - Alternativa: parsear logs de FFmpeg o usar SRS API

const _trackHistory = new Map() // clientId -> [{id, trackId, trackType, title, playedAt}]

const MAX_HISTORY = 200
const POLL_INTERVAL = 8000 // ms

let _intervals = new Map()

/**
 * Inicia el monitoreo de track history para un cliente.
 * Cada N segundos consulta el track actual y si cambió,
 * lo registra.
 */
export function startTracking(clientId, fetchCurrentTrackFn) {
  stopTracking(clientId)
  const interval = setInterval(async () => {
    try {
      const current = await fetchCurrentTrackFn(clientId)
      if (!current) return

      const history = _trackHistory.get(clientId) || []
      const last = history[history.length - 1]

      if (!last || last.trackId !== current.trackId) {
        history.push({
          id: generateId(),
          trackId: current.trackId,
          trackType: current.trackType || 'autodj',
          title: current.title || 'Unknown',
          artist: current.artist || null,
          thumbnail: current.thumbnail || null,
          playedAt: new Date().toISOString(),
        })

        if (history.length > MAX_HISTORY) {
          history.splice(0, history.length - MAX_HISTORY)
        }

        _trackHistory.set(clientId, history)
      }
    } catch (err) {
      console.error(`[track-history-video] Error polling for ${clientId}:`, err.message)
    }
  }, POLL_INTERVAL)

  _intervals.set(clientId, interval)
}

export function stopTracking(clientId) {
  const interval = _intervals.get(clientId)
  if (interval) {
    clearInterval(interval)
    _intervals.delete(clientId)
  }
}

export function getTrackHistory(clientId, page = 1, limit = 25) {
  const history = _trackHistory.get(clientId) || []
  const total = history.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const items = history.slice(start, start + limit).reverse()

  return {
    items,
    total,
    page,
    limit,
    totalPages,
  }
}

export function logTrackFromDb(clientId, trackData) {
  const history = _trackHistory.get(clientId) || []
  history.push({
    id: generateId(),
    trackId: trackData.id || null,
    trackType: 'music',
    title: trackData.title,
    artist: null,
    thumbnail: trackData.thumbnail || null,
    playedAt: new Date().toISOString(),
  })

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY)
  }

  _trackHistory.set(clientId, history)
}

export function detectAndLogVideoTrack(clientId, trackType, title, artist, thumbnail) {
  const history = _trackHistory.get(clientId) || []
  history.push({
    id: generateId(),
    trackId: null,
    trackType,
    title,
    artist: artist || null,
    thumbnail: thumbnail || null,
    playedAt: new Date().toISOString(),
  })

  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY)
  }

  _trackHistory.set(clientId, history)
}

let _idCounter = 0
function generateId() {
  return `vhist_${Date.now()}_${++_idCounter}`
}
