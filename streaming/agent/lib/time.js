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

/**
 * Devuelve hasta `limit` franjas ordenadas por su próximo inicio cronológico
 * respecto a `now` en la zona horaria del cliente. Cruza días de la semana y
 * medianoche: cada franja se proyecta a su próxima ocurrencia (ciclo semanal
 * de 7×1440 minutos) y se ordena por la distancia hasta ese inicio.
 *
 * @param {Array<{dayOfWeek: number, startTime: string, [k: string]: any}>} slots
 * @param {Date} now
 * @param {string} timeZone  zona IANA; inválida/vacía cae a UTC
 * @param {number} [limit=3]
 * @returns {Array} las primeras `limit` franjas sin mutar `slots`
 */
export function getNextSlots(slots, now, timeZone, limit = 3) {
  if (!Array.isArray(slots) || slots.length === 0) return []

  const { dayOfWeek: localDay, minutes: currentMinutes } = getLocalTimeInZone(now, timeZone)
  const localWeekMin = localDay * 1440 + currentMinutes
  const WEEK = 7 * 1440

  const candidates = slots
    .map((slot) => {
      const [sh, sm] = String(slot.startTime).split(':').map(Number)
      if (Number.isNaN(sh) || Number.isNaN(sm)) return null
      const startMinutes = sh * 60 + sm
      const slotWeekMin = slot.dayOfWeek * 1440 + startMinutes
      let delta = (slotWeekMin - localWeekMin) % WEEK
      if (delta < 0) delta += WEEK
      return { slot, delta }
    })
    .filter(Boolean)

  candidates.sort((a, b) => a.delta - b.delta)
  return candidates.slice(0, limit).map((c) => c.slot)
}
