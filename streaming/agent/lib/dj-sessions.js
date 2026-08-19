// =====================================================
// DJ Sessions — durable connect/disconnect history
// =====================================================

import crypto from 'crypto'
import { pool } from './db.js'
import { logger } from './logger.js'

/**
 * Start a DJ session. Idempotent: if an active session already exists for the
 * same DJ slot, it is reused instead of creating a duplicate.
 */
export async function startSession({ clientId, radioStreamId, djId, mount, role, ipAddress }) {
  // Buscar sesión abierta existente para este slot
  const [existing] = await pool.query(
    `SELECT id FROM dj_sessions
     WHERE clientId = ? AND djId = ? AND endedAt IS NULL
     ORDER BY startedAt DESC LIMIT 1`,
    [clientId, djId]
  )

  if (existing.length > 0) {
    logger.debug({ sessionId: existing[0].id }, 'Sesión DJ ya existe, reutilizando')
    return existing[0].id
  }

  const id = crypto.randomUUID()
  await pool.query(
    `INSERT INTO dj_sessions (id, clientId, radioStreamId, djId, mount, role, ipAddress, startedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [id, clientId, radioStreamId, djId, mount, role, ipAddress]
  )
  logger.info({ id, clientId, djId, mount }, 'DJ session iniciada')
  return id
}

/**
 * End the most recent open session for a DJ slot.
 */
export async function endSession({ clientId, djId }) {
  const [existing] = await pool.query(
    `SELECT id, startedAt FROM dj_sessions
     WHERE clientId = ? AND djId = ? AND endedAt IS NULL
     ORDER BY startedAt DESC LIMIT 1`,
    [clientId, djId]
  )

  if (existing.length === 0) return null

  const { id, startedAt } = existing[0]
  const durationSeconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))

  await pool.query(
    `UPDATE dj_sessions SET endedAt = NOW(), durationSeconds = ? WHERE id = ?`,
    [durationSeconds, id]
  )
  logger.info({ id, clientId, djId, durationSeconds }, 'DJ session finalizada')
  return id
}

/**
 * List DJ sessions for a client, paginated.
 */
export async function listSessions(clientId, { page = 1, limit = 25 } = {}) {
  const offset = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit))
  const pageSize = Math.min(100, Math.max(1, limit))

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM dj_sessions WHERE clientId = ?`,
    [clientId]
  )
  const total = countRows[0]?.cnt || 0

  const [rows] = await pool.query(
    `SELECT id, djId, mount, role, ipAddress, startedAt, endedAt, durationSeconds
     FROM dj_sessions
     WHERE clientId = ?
     ORDER BY startedAt DESC
     LIMIT ? OFFSET ?`,
    [clientId, pageSize, offset]
  )

  return {
    entries: rows,
    total,
    page,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}
