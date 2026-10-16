// =====================================================
// Analytics — lecturas de métricas para el panel
// =====================================================
// Lee los rollups (metrics_hourly / metrics_daily) y las sesiones
// crudas. La agrupación por día/semana respeta la zona horaria del
// cliente (client.timezone), calculada en JS con Intl.

import { prisma } from '@/lib/prisma'

export type Service = 'radio' | 'tv'
export type Granularity = 'hour' | 'day'

export interface TimeRange {
  period: string
  from: Date
  to: Date
  prevFrom: Date
  prevTo: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

export function isService(value: string | null): value is Service {
  return value === 'radio' || value === 'tv'
}

export function resolveRange(params: URLSearchParams, now = new Date()): TimeRange {
  const period = params.get('period') || 'week'
  const fromParam = params.get('from')
  const toParam = params.get('to')

  let to = new Date(now)
  let from: Date

  if (fromParam && toParam) {
    from = new Date(fromParam)
    to = new Date(toParam)
  } else {
    switch (period) {
      case 'day':
        from = new Date(to.getTime() - DAY_MS)
        break
      case 'month':
        from = new Date(to.getTime() - 30 * DAY_MS)
        break
      case 'week':
      default:
        from = new Date(to.getTime() - 7 * DAY_MS)
    }
  }

  const span = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime())
  const prevFrom = new Date(from.getTime() - span)

  return { period, from, to, prevFrom, prevTo }
}

export function inferGranularity(range: TimeRange, requested?: string | null): Granularity {
  if (requested === 'hour' || requested === 'day') return requested
  const spanDays = (range.to.getTime() - range.from.getTime()) / DAY_MS
  return spanDays <= 2 ? 'hour' : 'day'
}

// -----------------------------------------------------
// Zona horaria
// -----------------------------------------------------

export function zonedParts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  })
  const map: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return map
}

export function localDayKey(date: Date, tz: string): string {
  const p = zonedParts(date, tz)
  return `${p.year}-${p.month}-${p.day}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function localWeekdayHour(date: Date, tz: string): { weekday: number; hour: number } {
  const p = zonedParts(date, tz)
  const weekday = Math.max(0, WEEKDAYS.indexOf(p.weekday))
  return { weekday, hour: parseInt(p.hour, 10) }
}

export async function getClientTimezone(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { timezone: true } })
  return client?.timezone || 'UTC'
}

// -----------------------------------------------------
// Filas crudas de rollups
// -----------------------------------------------------

interface RollupMetrics {
  listenersAvg: number
  listenersMax: number
  listenerMinutes: number
  sessions: number
  airtimeSeconds: number
}

export interface SeriesPoint extends RollupMetrics {
  bucket: string
}

export function fetchHourly(clientId: string, service: Service, from: Date, to: Date): Promise<any[]> {
  return prisma.metricsHourly.findMany({
    where: { clientId, service, bucketStartUtc: { gte: from, lt: to } },
    orderBy: { bucketStartUtc: 'asc' },
  })
}

export function fetchDaily(clientId: string, service: Service): Promise<any[]> {
  return prisma.metricsDaily.findMany({ where: { clientId, service }, orderBy: { dayLocal: 'asc' } })
}

function aggWeightedAvg(rows: RollupMetrics[]): number {
  const totalAirtime = rows.reduce((s, r) => s + (r.airtimeSeconds || 0), 0)
  if (totalAirtime > 0) {
    return rows.reduce((s, r) => s + r.listenersAvg * (r.airtimeSeconds || 0), 0) / totalAirtime
  }
  return rows.length ? rows.reduce((s, r) => s + r.listenersAvg, 0) / rows.length : 0
}

/**
 * Serie por hora a partir de metrics_hourly.
 */
export function hourlySeries(rows: any[]): SeriesPoint[] {
  return rows.map((r) => ({
    bucket: new Date(r.bucketStartUtc).toISOString(),
    listenersAvg: r.listenersAvg || 0,
    listenersMax: r.listenersMax || 0,
    listenerMinutes: r.listenerMinutes || 0,
    sessions: r.sessions || 0,
    airtimeSeconds: r.airtimeSeconds || 0,
  }))
}

/**
 * Serie por día a partir de metrics_hourly, agrupada en la zona del cliente.
 */
export function dailySeriesFromHourly(rows: any[], tz: string): SeriesPoint[] {
  const groups = new Map<string, any[]>()
  for (const r of rows) {
    const day = localDayKey(new Date(r.bucketStartUtc), tz)
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day)!.push(r)
  }
  const points: SeriesPoint[] = []
  for (const [day, rs] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    points.push({
      bucket: day,
      listenersAvg: Math.round(aggWeightedAvg(rs) * 10) / 10,
      listenersMax: rs.reduce((m, r) => Math.max(m, r.listenersMax || 0), 0),
      listenerMinutes: Math.round(rs.reduce((s, r) => s + (r.listenerMinutes || 0), 0) * 10) / 10,
      sessions: rs.reduce((s, r) => s + (r.sessions || 0), 0),
      airtimeSeconds: rs.reduce((s, r) => s + (r.airtimeSeconds || 0), 0),
    })
  }
  return points
}

/**
 * Serie por día a partir de metrics_daily (día local ya calculado).
 */
export function dailySeriesFromDaily(rows: any[]): SeriesPoint[] {
  return rows.map((r) => ({
    bucket: new Date(r.dayLocal).toISOString().slice(0, 10),
    listenersAvg: r.listenersAvg || 0,
    listenersMax: r.listenersMax || 0,
    listenerMinutes: r.listenerMinutes || 0,
    sessions: r.sessions || 0,
    airtimeSeconds: r.airtimeSeconds || 0,
  }))
}

/**
 * Construye la serie del rango con la granularidad pedida.
 * Para 'day' prefiere metrics_daily; si no hay filas, deriva de hourly.
 */
export async function buildSeries(
  clientId: string,
  service: Service,
  range: { from: Date; to: Date },
  granularity: Granularity,
  tz: string
): Promise<SeriesPoint[]> {
  if (granularity === 'hour') {
    return hourlySeries(await fetchHourly(clientId, service, range.from, range.to))
  }
  const daily = await fetchDaily(clientId, service)
  const fromKey = localDayKey(range.from, tz)
  const toKey = localDayKey(range.to, tz)
  const inRange = daily.filter((r) => {
    const k = new Date(r.dayLocal).toISOString().slice(0, 10)
    return k >= fromKey && k <= toKey
  })
  if (inRange.length > 0) return dailySeriesFromDaily(inRange)
  return dailySeriesFromHourly(await fetchHourly(clientId, service, range.from, range.to), tz)
}

export function summarize(points: SeriesPoint[], uniqueListeners: number) {
  return {
    overallAvgListeners: Math.round(aggWeightedAvg(points) * 10) / 10,
    allTimePeakListeners: points.reduce((m, p) => Math.max(m, p.listenersMax), 0),
    listenerMinutes: Math.round(points.reduce((s, p) => s + p.listenerMinutes, 0) * 10) / 10,
    sessions: points.reduce((s, p) => s + p.sessions, 0),
    airtimeSeconds: points.reduce((s, p) => s + p.airtimeSeconds, 0),
    uniqueListeners,
    totalBuckets: points.length,
  }
}

// -----------------------------------------------------
// Audiencia única (sesiones crudas)
// -----------------------------------------------------

export async function getUniqueListeners(clientId: string, service: Service, from: Date, to: Date): Promise<number> {
  const where = { clientId, startedAt: { gte: from, lt: to }, ip: { not: null } }
  const model = service === 'radio' ? prisma.listenerSession : prisma.viewerSession
  try {
    const rows = await (model as any).findMany({ where, distinct: ['ip'], select: { ip: true } })
    return rows.length
  } catch {
    return 0
  }
}

// -----------------------------------------------------
// Rankings
// -----------------------------------------------------

export interface RankItem {
  label: string
  sublabel?: string | null
  count: number
  seconds?: number
}

export async function topTracks(clientId: string, from: Date, to: Date, take = 10): Promise<RankItem[]> {
  const rows = await prisma.playHistory.groupBy({
    by: ['title', 'artist'],
    where: { clientId, playedAt: { gte: from, lt: to }, type: { in: ['music', 'autodj', 'live_dj'] } },
    _count: { _all: true },
    orderBy: { _count: { title: 'desc' } },
    take,
  })
  return rows
    .filter((r) => r.title)
    .map((r) => ({ label: r.title as string, sublabel: r.artist, count: r._count._all }))
}

export async function topArtists(clientId: string, from: Date, to: Date, take = 10): Promise<RankItem[]> {
  const rows = await prisma.playHistory.groupBy({
    by: ['artist'],
    where: { clientId, playedAt: { gte: from, lt: to }, artist: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { artist: 'desc' } },
    take,
  })
  return rows
    .filter((r) => r.artist)
    .map((r) => ({ label: r.artist as string, count: r._count._all }))
}

export async function topVideos(clientId: string, from: Date, to: Date, take = 10): Promise<RankItem[]> {
  const rows = await prisma.videoPlayHistory.groupBy({
    by: ['title'],
    where: { clientId, playedAt: { gte: from, lt: to } },
    _count: { _all: true },
    orderBy: { _count: { title: 'desc' } },
    take,
  })
  return rows.map((r) => ({ label: r.title, count: r._count._all }))
}

export async function topDjs(clientId: string, from: Date, to: Date, take = 10): Promise<RankItem[]> {
  const rows = await prisma.djSession.findMany({
    where: { clientId, startedAt: { gte: from, lt: to } },
    select: { durationSeconds: true, dj: { select: { name: true } } },
  })
  const byDj = new Map<string, RankItem>()
  for (const r of rows) {
    const name = r.dj?.name || 'DJ'
    const item = byDj.get(name) || { label: name, count: 0, seconds: 0 }
    item.count += 1
    item.seconds = (item.seconds || 0) + (r.durationSeconds || 0)
    byDj.set(name, item)
  }
  return [...byDj.values()].sort((a, b) => (b.seconds || 0) - (a.seconds || 0)).slice(0, take)
}

// -----------------------------------------------------
// Heatmap día×hora
// -----------------------------------------------------

export async function getHeatmap(clientId: string, service: Service, from: Date, to: Date, tz: string) {
  const rows = await fetchHourly(clientId, service, from, to)
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const r of rows) {
    const { weekday, hour } = localWeekdayHour(new Date(r.bucketStartUtc), tz)
    matrix[weekday][hour] += r.listenerMinutes || 0
  }
  const max = matrix.reduce((m, row) => Math.max(m, ...row), 0)
  return { matrix, max }
}

// -----------------------------------------------------
// CSV
// -----------------------------------------------------

export function toCsv(points: SeriesPoint[]): string {
  const header = 'bucket,listeners_avg,listeners_max,listener_minutes,sessions,airtime_seconds'
  const lines = points.map((p) =>
    [csvCell(p.bucket), p.listenersAvg, p.listenersMax, p.listenerMinutes, p.sessions, p.airtimeSeconds].join(',')
  )
  return [header, ...lines].join('\n')
}

function csvCell(value: string): string {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
