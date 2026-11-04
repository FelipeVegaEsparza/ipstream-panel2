// =====================================================
// Fechas y posiciones de los especiales en el AutoDJ
// =====================================================

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria indicada. */
export function todayInTimezone(timezone, now = new Date()) {
  const tz = timezone || 'UTC'
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

/** Un especial sin fechas está siempre vigente. */
export function isSpecialInWindow(special, today) {
  const start = special.startDate || null
  const end = special.endDate || null
  if (start && today < start) return false
  if (end && today > end) return false
  return true
}

/** Posiciones (1-based) después de cuántos temas normales va el bloque. */
export function insertionPositions(everyTracks, trackCount) {
  const every = Number(everyTracks) || 0
  if (every < 1 || trackCount < 1) return []
  const positions = []
  for (let position = every; position <= trackCount; position += every) {
    positions.push(position)
  }
  return positions
}

/**
 * Arma el bloque [intro][temas][cierre] de un especial.
 * Recibe solo tracks ya verificados como disponibles.
 */
export function buildSpecialBlock({ name, introPath, closingPath, tracks, mp3Dir }) {
  const lines = []
  lines.push(`#EXTINF:-1,Especial · ${name}`)
  lines.push(introPath)
  for (const track of tracks) {
    const label = track.artist ? `${track.artist} - ${track.title || ''}` : (track.title || '')
    const duration = track.duration ? Math.round(track.duration) : -1
    lines.push(`#EXTINF:${duration},${label}`)
    lines.push(`${mp3Dir}/${track.fileName}`)
  }
  lines.push(`#EXTINF:-1,Cierre · ${name}`)
  lines.push(closingPath)
  return lines
}
