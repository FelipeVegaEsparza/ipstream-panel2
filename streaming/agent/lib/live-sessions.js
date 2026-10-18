// =====================================================
// Live Console — sesiones en memoria y limpieza
// =====================================================

import { logger } from './logger.js'
import { config } from './config.js'
import { stopBridge } from './live-bridge.js'

// sessionId -> session
const sessions = new Map()
// `${clientId}:${mount}` -> sessionId
const slots = new Map()
// sessionId -> { reason, at } para avisar al panel por qué terminó la sesión.
const recentEnds = new Map()

let sweepTimer = null

function slotKey(clientId, mount) {
  return `${clientId}:${String(mount || '').replace(/^\/+/, '')}`
}

export function getSession(sessionId) {
  return sessions.get(sessionId) || null
}

export function getSessionByStream(stream) {
  for (const session of sessions.values()) {
    if (session.stream === stream) return session
  }
  return null
}

export function getSessionByClient(clientId) {
  for (const session of sessions.values()) {
    if (session.clientId === clientId) return session
  }
  return null
}

export function createSession(payload) {
  const existing = slots.get(slotKey(payload.cid, payload.mount))
  if (existing) {
    const active = sessions.get(existing)
    if (active) {
      const err = new Error('El slot ya tiene una sesión activa')
      err.statusCode = 409
      throw err
    }
    slots.delete(slotKey(payload.cid, payload.mount))
  }

  const now = Date.now()
  recentEnds.delete(payload.sid)
  const session = {
    sessionId: payload.sid,
    stream: payload.sid,
    clientId: payload.cid,
    slotId: payload.slotId ?? null,
    mount: payload.mount,
    transport: payload.transport,
    startedAt: now,
    lastHeartbeat: now,
    bridge: null,
    origin: payload.transport,
  }
  sessions.set(session.sessionId, session)
  slots.set(slotKey(session.clientId, session.mount), session.sessionId)
  logger.info(
    { sessionId: session.sessionId, clientId: session.clientId, mount: session.mount, transport: session.transport },
    'Sesión live creada'
  )
  return session
}

export function touchSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return null
  session.lastHeartbeat = Date.now()
  return session
}

export function removeSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return null
  sessions.delete(sessionId)
  const key = slotKey(session.clientId, session.mount)
  if (slots.get(key) === sessionId) slots.delete(key)
  logger.info({ sessionId, clientId: session.clientId }, 'Sesión live cerrada')
  return session
}

export function listSessions() {
  return Array.from(sessions.values())
}

/** Motivo reciente de cierre (p. ej. 'silence') para el heartbeat del panel. */
export function getRecentEndReason(sessionId) {
  const entry = recentEnds.get(sessionId)
  if (!entry) return null
  if (Date.now() - entry.at > 60000) {
    recentEnds.delete(sessionId)
    return null
  }
  return entry.reason
}

/** Detiene el puente y libera la sesión. Seguro de llamar más de una vez. */
export async function endSession(session, reason = null) {
  if (!session) return
  if (reason) recentEnds.set(session.sessionId, { reason, at: Date.now() })
  try {
    if (reason && session.closeWithReason) session.closeWithReason(reason)
    else session.close?.()
  } catch {}
  await stopBridge(session)
  removeSession(session.sessionId)
}

export async function sweepStaleSessions(onStale) {
  const now = Date.now()
  for (const session of sessions.values()) {
    const age = now - session.startedAt
    const idle = now - session.lastHeartbeat
    if (age > config.live.staleMs && idle > config.live.staleMs) {
      logger.warn({ sessionId: session.sessionId, idle }, 'Sesión live sin heartbeat; cerrando')
      await onStale(session)
    }
  }
}

export function startSessionSweep(onStale) {
  if (sweepTimer) return
  sweepTimer = setInterval(() => {
    void sweepStaleSessions(onStale)
  }, 15000)
}

export async function stopAllSessions() {
  for (const session of Array.from(sessions.values())) {
    await endSession(session)
  }
}

export function stopSessionSweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer)
    sweepTimer = null
  }
}
