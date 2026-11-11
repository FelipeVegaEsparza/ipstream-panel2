// =====================================================
// Ventanas de la parrilla horaria (puro, sin DB).
// Misma semántica que el agente: la franja activa exige el mismo día local y
// las franjas que cruzan medianoche se evalúan por minutos.
// =====================================================

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const WEEK_MINUTES = 7 * 1440

export interface LocalTime {
  dayOfWeek: number
  minutes: number
}

export interface ScheduleSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export function localTime(date: Date, timeZone: string): LocalTime {
  let zone = 'UTC'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    zone = timeZone
  } catch {
    zone = 'UTC'
  }
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) parts[part.type] = part.value
  const weekday = String(parts.weekday || 'sun').toLowerCase()
  const index = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number])
  const hour = Number(parts.hour || 0) % 24
  const minute = Number(parts.minute || 0)
  return {
    dayOfWeek: index >= 0 ? index : 0,
    minutes: hour * 60 + minute,
  }
}

export function parseClock(value: string): number {
  const [h, m] = String(value).split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return -1
  return h * 60 + m
}

export function isSlotActive(local: LocalTime, slot: ScheduleSlot): boolean {
  if (local.dayOfWeek !== slot.dayOfWeek) return false
  const start = parseClock(slot.startTime)
  const end = parseClock(slot.endTime)
  if (start < 0 || end < 0) return false
  if (end <= start) return local.minutes >= start || local.minutes < end
  return local.minutes >= start && local.minutes < end
}

/**
 * Minutos hasta el inicio de la franja si está activa (0) o empieza dentro del
 * lookahead. `null` si todavía no corresponde.
 */
export function minutesUntilSlot(
  slot: ScheduleSlot,
  now: Date,
  timeZone: string,
  lookaheadMinutes: number
): number | null {
  const local = localTime(now, timeZone)
  if (isSlotActive(local, slot)) return 0

  const start = parseClock(slot.startTime)
  if (start < 0) return null
  const nowMinutes = local.dayOfWeek * 1440 + local.minutes
  const slotMinutes = slot.dayOfWeek * 1440 + start
  let delta = (slotMinutes - nowMinutes) % WEEK_MINUTES
  if (delta < 0) delta += WEEK_MINUTES
  return delta <= lookaheadMinutes ? delta : null
}
