// =====================================================
// Analytics — buckets de tiempo en zona horaria del cliente
// =====================================================
// Todo el almacenamiento es UTC; los buckets locales se calculan
// con Intl (sin CONVERT_TZ de MySQL). Funciones puras.

/**
 * Inicio de la hora UTC.
 */
export function floorToHourUtc(date) {
  const d = new Date(date)
  d.setUTCMinutes(0, 0, 0)
  return d
}

/**
 * Partes de fecha/hora en una zona IANA.
 */
export function zonedParts(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const map = {}
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return map
}

/**
 * Clave de día local "YYYY-MM-DD".
 */
export function localDayKey(date, tz) {
  const p = zonedParts(date, tz)
  return `${p.year}-${p.month}-${p.day}`
}

/**
 * Clave de hora local "YYYY-MM-DDTHH".
 */
export function localHourKey(date, tz) {
  const p = zonedParts(date, tz)
  return `${p.year}-${p.month}-${p.day}T${p.hour}`
}

/**
 * Offset de la zona (tz - UTC) en minutos para un instante dado.
 */
export function timeZoneOffsetMinutes(date, tz) {
  const p = zonedParts(date, tz)
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return (asUtc - date.getTime()) / 60000
}

/**
 * Instante UTC que corresponde a la medianoche local de `date` en `tz`.
 */
export function startOfLocalDayUtc(date, tz) {
  const p = zonedParts(date, tz)
  const guess = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0)
  const offset = timeZoneOffsetMinutes(new Date(guess), tz)
  return new Date(guess - offset * 60000)
}
