// =====================================================
// Time utilities — resolución de hora local en zona IANA
// =====================================================

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Resuelve el día de la semana (0=domingo..6=sábado) y los minutos del día
 * de un Date expresado en la zona horaria IANA indicada.
 *
 * Usa Intl.DateTimeFormat con timeZone; si la zona es inválida o faltante,
 * cae a 'UTC'. No muta el Date recibido.
 */
export function getLocalTimeInZone(date, timeZone) {
  let zone = 'UTC'
  if (timeZone) {
    try {
      // Valida que la zona sea soportada; si no, lanza RangeError y cae a UTC.
      new Intl.DateTimeFormat('en-US', { timeZone })
      zone = timeZone
    } catch (_) {
      zone = 'UTC'
    }
  }

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = {}
  for (const part of fmt.formatToParts(date)) {
    parts[part.type] = part.value
  }

  const weekday = (parts.weekday || 'sun').toLowerCase()
  const hour = parseInt(parts.hour || '0', 10) % 24
  const minute = parseInt(parts.minute || '0', 10)

  return {
    dayOfWeek: WEEKDAYS.indexOf(weekday),
    minutes: hour * 60 + minute,
  }
}

/**
 * Verifica si un Date cae dentro de una franja horaria expresada en la zona
 * del cliente. Soporta franjas que cruzan la medianoche (start > end).
 */
export function isTimeInSlot(now, dayOfWeek, startTime, endTime, timeZone) {
  const { dayOfWeek: localDay, minutes: currentMinutes } = getLocalTimeInZone(now, timeZone)
  if (localDay !== dayOfWeek) return false

  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMinutes = sh * 60 + sm
  const endMinutes = eh * 60 + em

  if (endMinutes <= startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}
