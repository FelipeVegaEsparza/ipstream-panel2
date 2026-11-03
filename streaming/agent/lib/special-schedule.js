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
