// Evaluador puro de reglas de cápsulas de noticias.
// No toca DB ni telnet: recibe datos y devuelve si corresponde emitir.

function partsInZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value || ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  }
}

function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let guess = target
  for (let i = 0; i < 3; i += 1) {
    const p = partsInZone(new Date(guess), timeZone)
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    const diff = target - actual
    if (diff === 0) break
    guess += diff
  }
  return new Date(guess)
}

function parseTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '')
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function localDay(date, timeZone) {
  const p = partsInZone(date, timeZone)
  return Date.UTC(p.year, p.month - 1, p.day) / 86400000
}

export function isWithinWindow(capsule, now, timeZone) {
  if (capsule.status !== 'approved' || !capsule.audioUrl) return false
  if (capsule.activeFrom && now < new Date(capsule.activeFrom)) return false
  if (capsule.activeTo && now > new Date(capsule.activeTo)) return false
  const start = parseTime(capsule.windowStart)
  const end = parseTime(capsule.windowEnd)
  if (!start || !end) return true
  const p = partsInZone(now, timeZone)
  const current = p.hour * 60 + p.minute
  const from = start.hour * 60 + start.minute
  const to = end.hour * 60 + end.minute
  if (from === to) return true
  return from < to ? current >= from && current <= to : current >= from || current <= to
}

function isInCooldown(capsule, now) {
  if (!capsule.lastPlayedAt) return false
  return now.getTime() - new Date(capsule.lastPlayedAt).getTime() < Number(capsule.minGapMinutes || 30) * 60000
}

function withinDays(days, now, timeZone) {
  if (!Array.isArray(days) || days.length === 0) return true
  // getDay() sobre la fecha local reconstruida a UTC evita depender del TZ del host.
  const p = partsInZone(now, timeZone)
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
  return days.includes(day)
}

function intervalStart(config, now, timeZone) {
  const every = Number(config.everyHours)
  if (!Number.isInteger(every) || every < 1 || every > 24) return null
  const start = parseTime(config.startAt) || { hour: 0, minute: 0 }
  const p = partsInZone(now, timeZone)
  let candidate = zonedTimeToUtc(p.year, p.month, p.day, start.hour, start.minute, timeZone)
  if (candidate > now) candidate = new Date(candidate.getTime() - 86400000)
  const step = every * 3600000
  while (candidate.getTime() + step <= now.getTime()) candidate = new Date(candidate.getTime() + step)
  return candidate
}

export function evaluateRule(capsule, rule, { now, timeZone, tracksSinceLastPlay }) {
  if (!rule.active) return { due: false, reason: 'rule_inactive' }
  if (!isWithinWindow(capsule, now, timeZone)) return { due: false, reason: 'outside_window' }
  if (!withinDays(rule.days, now, timeZone)) return { due: false, reason: 'outside_days' }
  if (isInCooldown(capsule, now)) return { due: false, reason: 'cooldown' }

  const config = typeof rule.config === 'string' ? JSON.parse(rule.config) : (rule.config || {})
  if (rule.kind === 'tracks') {
    const every = Number(config.everyTracks)
    if (!Number.isInteger(every) || every < 1) return { due: false, reason: 'invalid_rule' }
    return tracksSinceLastPlay >= every
      ? { due: true, scheduledFor: now, ruleId: rule.id }
      : { due: false, reason: 'track_count' }
  }
  if (rule.kind === 'interval_hours') {
    const scheduledFor = intervalStart(config, now, timeZone)
    if (!scheduledFor) return { due: false, reason: 'invalid_rule' }
    return now.getTime() - scheduledFor.getTime() <= Number(capsule.graceMinutes || 10) * 60000
      ? { due: true, scheduledFor, ruleId: rule.id }
      : { due: false, reason: 'grace_expired' }
  }
  if (rule.kind === 'times') {
    const times = Array.isArray(config.times) ? config.times : []
    const p = partsInZone(now, timeZone)
    for (const value of times) {
      const time = parseTime(value)
      if (!time) continue
      const scheduledFor = zonedTimeToUtc(p.year, p.month, p.day, time.hour, time.minute, timeZone)
      const age = now.getTime() - scheduledFor.getTime()
      if (age >= 0 && age <= Number(capsule.graceMinutes || 10) * 60000) {
        return { due: true, scheduledFor, ruleId: rule.id }
      }
    }
    return { due: false, reason: 'no_time_match' }
  }
  return { due: false, reason: 'invalid_rule' }
}

export function evaluateCapsule(capsule, rules, context) {
  if (!isWithinWindow(capsule, context.now, context.timeZone)) {
    return { due: false, reason: 'outside_window' }
  }
  if (isInCooldown(capsule, context.now)) return { due: false, reason: 'cooldown' }
  const capsuleContext = {
    ...context,
    tracksSinceLastPlay: Number(capsule.tracksSinceLastPlay ?? context.tracksSinceLastPlay ?? 0),
  }
  let lastReason = 'no_rule'
  for (const rule of rules) {
    const result = evaluateRule(capsule, rule, capsuleContext)
    if (result.due) return result
    lastReason = result.reason || lastReason
  }
  return { due: false, reason: lastReason }
}

export function pickCandidate(capsules, context) {
  return capsules
    .map((capsule) => {
      const result = evaluateCapsule(capsule, capsule.rules || [], context)
      return result.due ? { capsule, ...result } : null
    })
    .filter(Boolean)
    .sort((a, b) => {
      const priority = Number(b.capsule.priority || 5) - Number(a.capsule.priority || 5)
      if (priority !== 0) return priority
      return (a.scheduledFor?.getTime() || 0) - (b.scheduledFor?.getTime() || 0)
    })[0] || null
}

export { localDay }
