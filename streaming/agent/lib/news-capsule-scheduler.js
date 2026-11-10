// Scheduler de cápsulas de noticias: evalúa reglas y empuja a la cola de Liquidsoap.
// La cola usa `fallback(track_sensitive=true)`, por lo que nunca corta el tema actual.

import crypto from 'crypto'
import { existsSync } from 'fs'
import { pool } from './db.js'
import { logger } from './logger.js'
import { telnetCommand } from './liquidsoap-telnet.js'
import { newsCapsuleAudioPath } from './files.js'
import { pickCandidate } from './news-capsule-schedule.js'

const INTERVAL_MS = 15_000
let timer = null
let running = false

function uuid() {
  return crypto.randomUUID()
}

async function loadRules(capsuleIds) {
  if (capsuleIds.length === 0) return new Map()
  const [rows] = await pool.query(
    `SELECT id, capsuleId, kind, config, days, active
       FROM news_capsule_rules
      WHERE capsuleId IN (${capsuleIds.map(() => '?').join(',')}) AND active = 1`,
    capsuleIds
  )
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.capsuleId)) map.set(row.capsuleId, [])
    map.get(row.capsuleId).push({
      id: row.id,
      kind: row.kind,
      config: row.config,
      days: row.days ? JSON.parse(row.days) : null,
      active: Boolean(row.active),
    })
  }
  return map
}

async function lastPlayedMap(clientId) {
  const [rows] = await pool.query(
    `SELECT capsuleId, MAX(playedAt) AS lastPlayedAt
       FROM news_capsule_runs
      WHERE clientId = ? AND status = 'played'
      GROUP BY capsuleId`,
    [clientId]
  )
  return new Map(rows.map((row) => [row.capsuleId, row.lastPlayedAt]))
}

async function tracksSince(clientId, since) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM play_history
      WHERE clientId = ? AND type = 'music' AND playedAt >= ?`,
    [clientId, since]
  )
  return Number(rows[0]?.total || 0)
}

async function pendingRuns(clientId) {
  const [rows] = await pool.query(
    `SELECT id, capsuleId, scheduledFor, pushedAt, status
       FROM news_capsule_runs
      WHERE clientId = ? AND status = 'pending'
      ORDER BY scheduledFor ASC`,
    [clientId]
  )
  return rows
}

async function markRun(id, status, reason = null) {
  await pool.query(
    `UPDATE news_capsule_runs SET status = ?, reason = ?, playedAt = ? WHERE id = ?`,
    [status, reason, status === 'played' ? new Date() : null, id]
  )
}

async function processPending(clientId, rs, now) {
  const pending = await pendingRuns(clientId)
  for (const run of pending) {
    const pushedAt = run.pushedAt ? new Date(run.pushedAt) : null
    const startedAt = rs.currentTrackStartedAt ? new Date(rs.currentTrackStartedAt) : null
    if (pushedAt && startedAt && startedAt > pushedAt && now.getTime() - pushedAt.getTime() > 5_000) {
      await markRun(run.id, 'played')
      logger.info({ clientId, capsuleId: run.capsuleId, runId: run.id }, 'Cápsula de noticias emitida')
      continue
    }
    const scheduled = new Date(run.scheduledFor)
    const graceMs = Number(rs.newsGraceMinutes || 10) * 60_000
    if (now.getTime() > scheduled.getTime() + graceMs + 5 * 60_000) {
      try {
        await telnetCommand(rs.liquidsoapTelnetPort, 'news_queue.skip')
      } catch {}
      await markRun(run.id, 'expired', 'grace_expired')
      logger.info({ clientId, capsuleId: run.capsuleId, runId: run.id }, 'Cápsula expirada')
    }
  }
}

export async function pushCapsule(clientId, rs, capsule, scheduledFor, deps = {}) {
  const db = deps.db || pool
  const telnet = deps.telnet || telnetCommand
  const exists = deps.exists || existsSync
  const audioPath = newsCapsuleAudioPath(clientId, capsule.id)
  if (!exists(audioPath)) {
    logger.warn({ clientId, capsuleId: capsule.id, audioPath }, 'Cápsula sin audio en el agente')
    return false
  }
  const escaped = audioPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  await telnet(
    rs.liquidsoapTelnetPort,
    `news_queue.push(request.create("file://${escaped}"))`
  )
  const runId = uuid()
  await db.query(
    `INSERT INTO news_capsule_runs
      (id, capsuleId, clientId, scheduledFor, pushedAt, status, reason, createdAt)
     VALUES (?, ?, ?, ?, ?, 'pending', NULL, NOW())`,
    [runId, capsule.id, clientId, scheduledFor || new Date()]
  )
  logger.info({ clientId, capsuleId: capsule.id, runId }, 'Cápsula empujada a la cola de noticias')
  return true
}

export async function evaluateNewsCapsulesNow(now = new Date()) {
  if (running) return
  running = true
  try {
    const [rows] = await pool.query(
      `SELECT nc.id, nc.clientId, nc.title, nc.audioUrl, nc.priority, nc.minGapMinutes,
              nc.graceMinutes, nc.windowStart, nc.windowEnd, nc.activeFrom, nc.activeTo,
              nc.createdAt, c.timezone, rs.status AS streamStatus, rs.liquidsoapTelnetPort,
              rs.currentTrackStartedAt, rs.enabled
         FROM news_capsules nc
         JOIN clients c ON c.id = nc.clientId
         JOIN radio_streams rs ON rs.clientId = nc.clientId
        WHERE nc.status = 'approved' AND nc.audioUrl IS NOT NULL AND rs.enabled = 1`
    )
    const byClient = new Map()
    for (const row of rows) {
      if (!byClient.has(row.clientId)) byClient.set(row.clientId, [])
      byClient.get(row.clientId).push(row)
    }

    for (const [clientId, capsules] of byClient) {
      const rs = capsules[0]
      if (rs.streamStatus === 'live') continue
      await processPending(clientId, rs, now)
      const rules = await loadRules(capsules.map((capsule) => capsule.id))
      const lastPlayed = await lastPlayedMap(clientId)
      const enriched = []
      for (const capsule of capsules) {
        const since = lastPlayed.get(capsule.id) || capsule.createdAt
        const count = await tracksSince(clientId, since)
        enriched.push({
          ...capsule,
          rules: rules.get(capsule.id) || [],
          lastPlayedAt: lastPlayed.get(capsule.id) || null,
          tracksSinceLastPlay: count,
        })
      }
      const candidate = pickCandidate(enriched, {
        now,
        timeZone: rs.timezone || 'UTC',
        tracksSinceLastPlay: 0,
      })
      if (!candidate) continue
      const pending = await pendingRuns(clientId)
      if (pending.some((run) => run.capsuleId === candidate.capsule.id)) continue
      await pushCapsule(clientId, rs, candidate.capsule, candidate.scheduledFor)
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Evaluación de cápsulas de noticias falló')
  } finally {
    running = false
  }
}

export function startNewsCapsuleScheduler() {
  if (timer) return
  timer = setInterval(() => {
    void evaluateNewsCapsulesNow()
  }, INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
  logger.info({ intervalMs: INTERVAL_MS }, 'Scheduler de cápsulas de noticias iniciado')
}

export function stopNewsCapsuleScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
