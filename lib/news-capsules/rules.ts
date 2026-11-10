import type { NewsRuleKind } from './types'

export interface NewsRuleConfig {
  everyTracks?: number
  times?: string[]
  everyHours?: number
  startAt?: string
}

export interface NewsRuleData {
  id: string
  kind: NewsRuleKind
  config: NewsRuleConfig
  days?: number[] | null
  active: boolean
}

export interface NewsCapsuleScheduleData {
  id: string
  title: string
  status: string
  priority: number
  minGapMinutes: number
  graceMinutes: number
  windowStart: string | null
  windowEnd: string | null
  activeFrom: Date | null
  activeTo: Date | null
  rules: NewsRuleData[]
  lastPlayedAt?: Date | null
}

export interface RuleContext {
  now: Date
  timezone: string
  tracksSinceLastPlay: number
}

export interface DueResult {
  due: boolean
  scheduledFor: Date | null
  reason?: string
}

function partsInZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = formatter.formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: get('weekday'),
  }
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let guess = target
  for (let i = 0; i < 3; i += 1) {
    const parts = partsInZone(new Date(guess), timeZone)
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const diff = target - actual
    if (diff === 0) break
    guess += diff
  }
  return new Date(guess)
}

function localDateKey(date: Date, timeZone: string): string {
  const parts = partsInZone(date, timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function parseTime(value: string | null | undefined): { hour: number; minute: number } | null {
  if (!value) return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

function dayNumber(date: Date, timeZone: string): number {
  const weekday = partsInZone(date, timeZone).weekday
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[weekday] ?? 0
}

function withinDays(days: number[] | null | undefined, date: Date, timeZone: string): boolean {
  return !days || days.length === 0 || days.includes(dayNumber(date, timeZone))
}

export function isWithinWindow(capsule: NewsCapsuleScheduleData, now: Date, timeZone: string): boolean {
  if (capsule.status !== 'approved') return false
  if (capsule.activeFrom && now < capsule.activeFrom) return false
  if (capsule.activeTo && now > capsule.activeTo) return false
  const start = parseTime(capsule.windowStart)
  const end = parseTime(capsule.windowEnd)
  if (!start || !end) return true
  const parts = partsInZone(now, timeZone)
  const current = parts.hour * 60 + parts.minute
  const from = start.hour * 60 + start.minute
  const to = end.hour * 60 + end.minute
  if (from === to) return true
  return from < to ? current >= from && current <= to : current >= from || current <= to
}

export function isInCooldown(capsule: NewsCapsuleScheduleData, now: Date): boolean {
  if (!capsule.lastPlayedAt) return false
  return now.getTime() - capsule.lastPlayedAt.getTime() < capsule.minGapMinutes * 60_000
}

function mostRecentInterval(
  config: NewsRuleConfig,
  now: Date,
  timeZone: string
): Date | null {
  const everyHours = Number(config.everyHours)
  if (!Number.isInteger(everyHours) || everyHours < 1 || everyHours > 24) return null
  const start = parseTime(config.startAt) || { hour: 0, minute: 0 }
  const parts = partsInZone(now, timeZone)
  const todayStart = zonedTimeToUtc(parts.year, parts.month, parts.day, start.hour, start.minute, timeZone)
  let candidate = todayStart
  if (candidate.getTime() > now.getTime()) {
    const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60_000)
    candidate = zonedTimeToUtc(
      partsInZone(yesterday, timeZone).year,
      partsInZone(yesterday, timeZone).month,
      partsInZone(yesterday, timeZone).day,
      start.hour,
      start.minute,
      timeZone
    )
  }
  const step = everyHours * 60 * 60_000
  while (candidate.getTime() + step <= now.getTime()) candidate = new Date(candidate.getTime() + step)
  return candidate
}

function nextTimeOccurrence(
  config: NewsRuleConfig,
  now: Date,
  timeZone: string,
  days: number[] | null | undefined
): Date | null {
  const times = (config.times || [])
    .map((value) => parseTime(value))
    .filter((value): value is { hour: number; minute: number } => value !== null)
  if (times.length === 0) return null
  const parts = partsInZone(now, timeZone)
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset))
    const dayParts = partsInZone(day, timeZone)
    if (!withinDays(days, day, timeZone)) continue
    for (const time of times) {
      const candidate = zonedTimeToUtc(
        dayParts.year,
        dayParts.month,
        dayParts.day,
        time.hour,
        time.minute,
        timeZone
      )
      if (candidate.getTime() > now.getTime()) return candidate
    }
  }
  return null
}

export function evaluateRule(
  capsule: NewsCapsuleScheduleData,
  rule: NewsRuleData,
  context: RuleContext
): DueResult {
  if (!rule.active) return { due: false, scheduledFor: null, reason: 'rule_inactive' }
  if (!isWithinWindow(capsule, context.now, context.timezone)) {
    return { due: false, scheduledFor: null, reason: 'outside_window' }
  }
  if (!withinDays(rule.days, context.now, context.timezone)) {
    return { due: false, scheduledFor: null, reason: 'outside_days' }
  }
  if (isInCooldown(capsule, context.now)) {
    return { due: false, scheduledFor: null, reason: 'cooldown' }
  }

  if (rule.kind === 'tracks') {
    const every = Number(rule.config.everyTracks)
    if (!Number.isInteger(every) || every < 1) return { due: false, scheduledFor: null, reason: 'invalid_rule' }
    return context.tracksSinceLastPlay >= every
      ? { due: true, scheduledFor: context.now }
      : { due: false, scheduledFor: null, reason: 'track_count' }
  }

  if (rule.kind === 'interval_hours') {
    const scheduledFor = mostRecentInterval(rule.config, context.now, context.timezone)
    if (!scheduledFor) return { due: false, scheduledFor: null, reason: 'invalid_rule' }
    const age = context.now.getTime() - scheduledFor.getTime()
    return age <= capsule.graceMinutes * 60_000
      ? { due: true, scheduledFor }
      : { due: false, scheduledFor: null, reason: 'grace_expired' }
  }

  if (rule.kind === 'times') {
    const parts = partsInZone(context.now, context.timezone)
    const times = (rule.config.times || [])
      .map((value) => parseTime(value))
      .filter((value): value is { hour: number; minute: number } => value !== null)
    for (const time of times) {
      const scheduledFor = zonedTimeToUtc(
        parts.year,
        parts.month,
        parts.day,
        time.hour,
        time.minute,
        context.timezone
      )
      const age = context.now.getTime() - scheduledFor.getTime()
      if (age >= 0 && age <= capsule.graceMinutes * 60_000) {
        return { due: true, scheduledFor }
      }
    }
    return { due: false, scheduledFor: null, reason: 'no_time_match' }
  }

  return { due: false, scheduledFor: null, reason: 'invalid_rule' }
}

export function evaluateCapsule(
  capsule: NewsCapsuleScheduleData,
  context: RuleContext
): { due: boolean; scheduledFor: Date | null; ruleId?: string; reason?: string } {
  if (!isWithinWindow(capsule, context.now, context.timezone)) {
    return { due: false, scheduledFor: null, reason: 'outside_window' }
  }
  if (isInCooldown(capsule, context.now)) {
    return { due: false, scheduledFor: null, reason: 'cooldown' }
  }
  let lastReason = 'no_rule'
  for (const rule of capsule.rules) {
    const result = evaluateRule(capsule, rule, context)
    if (result.due) {
      return { due: true, scheduledFor: result.scheduledFor, ruleId: rule.id }
    }
    lastReason = result.reason || lastReason
  }
  return { due: false, scheduledFor: null, reason: lastReason }
}

export function pickDueCapsules(
  capsules: NewsCapsuleScheduleData[],
  context: RuleContext
): Array<{ capsule: NewsCapsuleScheduleData; scheduledFor: Date | null; ruleId: string }> {
  return capsules
    .map((capsule) => {
      const result = evaluateCapsule(capsule, context)
      return result.due
        ? { capsule, scheduledFor: result.scheduledFor, ruleId: result.ruleId || '' }
        : null
    })
    .filter((value): value is { capsule: NewsCapsuleScheduleData; scheduledFor: Date | null; ruleId: string } => value !== null)
    .sort((a, b) => {
      if (b.capsule.priority !== a.capsule.priority) return b.capsule.priority - a.capsule.priority
      return (a.scheduledFor?.getTime() || 0) - (b.scheduledFor?.getTime() || 0)
    })
}

export function nextEmissionAt(
  capsule: NewsCapsuleScheduleData,
  now: Date,
  timeZone: string
): Date | null {
  if (capsule.status !== 'approved') return null
  let next: Date | null = null
  for (const rule of capsule.rules) {
    if (!rule.active) continue
    if (rule.kind === 'times') {
      const candidate = nextTimeOccurrence(rule.config, now, timeZone, rule.days)
      if (candidate && (!next || candidate < next)) next = candidate
    } else if (rule.kind === 'interval_hours') {
      const every = Number(rule.config.everyHours)
      if (!Number.isInteger(every) || every < 1) continue
      const recent = mostRecentInterval(rule.config, now, timeZone)
      if (recent) {
        const candidate = new Date(recent.getTime() + every * 60 * 60_000)
        if (!next || candidate < next) next = candidate
      }
    }
  }
  return next
}

export function localDateLabel(date: Date, timeZone: string): string {
  return localDateKey(date, timeZone)
}
