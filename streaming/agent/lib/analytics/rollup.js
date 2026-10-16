// =====================================================
// Analytics — agregación de rollups (puro)
// =====================================================

import { localDayKey } from './time-buckets.js'

function round1(n) {
  return Math.round(n * 10) / 10
}

function emptyGroup() {
  return {
    count: 0,
    sum: 0,
    max: 0,
    airtimeSeconds: 0,
    listenerMinutes: 0,
    sessionsCount: 0,
    uniqueIps: new Set(),
  }
}

function addSamples(g, samples, intervalSeconds) {
  for (const s of samples) {
    g.count++
    g.sum += s.value
    if (s.value > g.max) g.max = s.value
    if (s.online) g.airtimeSeconds += intervalSeconds
    g.listenerMinutes += (s.value * intervalSeconds) / 60
  }
}

function addSessions(g, sessions) {
  for (const s of sessions) {
    g.sessionsCount++
    if (s.ip) g.uniqueIps.add(s.ip)
  }
}

function toMetrics(g) {
  return {
    listenersAvg: g.count ? round1(g.sum / g.count) : 0,
    listenersMax: g.max,
    listenerMinutes: round1(g.listenerMinutes),
    sessions: g.sessionsCount,
    airtimeSeconds: g.airtimeSeconds,
    uniqueListeners: g.uniqueIps.size,
  }
}

/**
 * Rollup de una hora UTC. samples/sessions ya acotados a esa hora.
 * @returns {Array<object>} filas de metrics_hourly (sin bucketStartUtc)
 */
export function computeHourlyRows({ samples, sessions, intervalSeconds, bucketStartUtc }) {
  const groups = new Map()
  const get = (clientId) => {
    let g = groups.get(clientId)
    if (!g) {
      g = emptyGroup()
      groups.set(clientId, g)
    }
    return g
  }
  for (const s of samples) addSamples(get(s.clientId), [s], intervalSeconds)
  for (const s of sessions) addSessions(get(s.clientId), [s])

  const rows = []
  for (const [clientId, g] of groups.entries()) {
    rows.push({ clientId, bucketStartUtc, ...toMetrics(g) })
  }
  return rows
}

/**
 * Rollup diario alineado al día local del cliente.
 * Cada sample/session debe traer su `timestamp`/`startedAt`.
 * @returns {Array<object>} filas de metrics_daily (con dayLocal "YYYY-MM-DD")
 */
export function computeDailyRows({ samples, sessions, intervalSeconds, tz }) {
  const groups = new Map()
  const keyOf = (clientId, date) => `${clientId}|${localDayKey(date, tz)}`
  const get = (clientId, date) => {
    const k = keyOf(clientId, date)
    let g = groups.get(k)
    if (!g) {
      g = { clientId, dayLocal: localDayKey(date, tz), ...emptyGroup() }
      groups.set(k, g)
    }
    return g
  }
  for (const s of samples) addSamples(get(s.clientId, s.timestamp), [s], intervalSeconds)
  for (const s of sessions) addSessions(get(s.clientId, s.startedAt), [s])

  const rows = []
  for (const g of groups.values()) {
    rows.push({ clientId: g.clientId, dayLocal: g.dayLocal, tz, ...toMetrics(g) })
  }
  return rows
}
