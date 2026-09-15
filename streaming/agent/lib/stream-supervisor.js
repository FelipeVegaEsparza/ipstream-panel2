// =====================================================
// Stream Supervisor — detecta streams muertos y los recupera
// =====================================================
// Revisa cada 60s que los streams marcados como running en DB
// realmente tengan un proceso Liquidsoap activo. Si no:
//   - exige dos detecciones consecutivas (evita falsos negativos
//     de `docker exec`),
//   - no reinicia si el stream está deshabilitado, si fue detenido
//     intencionalmente (autoRestart=0) o si hay un DJ conectado,
//   - reintenta con backoff creciente hasta un tope,
//   - audita cada reinicio y cada abandono.
// =====================================================

import { logger } from './logger.js'
import { pool } from './db.js'
import { isProcessRunning, startStream } from './liquidsoap.js'
import { resolveSelfServerId } from './self-server.js'
import { isAnyHarborSourceConnected } from './liquidsoap-telnet.js'

const CHECK_INTERVAL_MS = 60_000
// Espera entre reintentos (ms). Se usa el índice min(attempts-1, len-1).
const RESTART_BACKOFF_MS = [15_000, 30_000, 60_000, 120_000, 300_000]
const MAX_RESTART_ATTEMPTS = 6
// Chequeos consecutivos sin proceso antes de reiniciar. Evita que un
// fallo transitorio de `docker exec` dispare un reinicio innecesario.
const MISSES_BEFORE_RESTART = 2

let intervalHandle = null
// clientId -> { attempts, misses, nextAttemptAt }
const _recovery = new Map()

export function startStreamSupervisor() {
  if (intervalHandle) return
  logger.info('Stream supervisor iniciado (intervalo: 60s)')
  intervalHandle = setInterval(checkStreams, CHECK_INTERVAL_MS)
}

export function stopStreamSupervisor() {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

function resetRecovery(clientId) {
  _recovery.delete(clientId)
}

async function audit(clientId, action, payload) {
  try {
    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (UUID(), ?, ?, ?, NOW())`,
      [clientId, action, JSON.stringify(payload)]
    )
  } catch (err) {
    logger.warn({ err: err.message, clientId, action }, 'Supervisor: no se pudo auditar')
  }
}

async function markOff(clientId, lastError) {
  await pool.query(
    `UPDATE radio_streams SET liquidsoapRunning = 0, liquidsoapPid = NULL, status = 'off', lastError = ?, updatedAt = NOW() WHERE clientId = ?`,
    [lastError, clientId]
  )
}

async function checkStreams() {
  try {
    const selfId = await resolveSelfServerId()

    // Solo supervisar streams de ESTE servidor (o legacy sin serverId).
    // Se incluyen los que declaramos running para poder reintentar aunque el
    // proceso ya no exista (no se baja liquidsoapRunning hasta abandonar).
    const [rows] = await pool.query(
      `SELECT clientId, icecastMount, status, enabled, autoRestart, liquidsoapTelnetPort
       FROM radio_streams WHERE liquidsoapRunning = 1 ${
        selfId ? 'AND serverId = ?' : 'AND serverId IS NULL'
      }`,
      selfId ? [selfId] : []
    )

    for (const row of rows) {
      try {
        await checkStream(row)
      } catch (err) {
        logger.warn({ err: err.message, clientId: row.clientId }, 'Stream supervisor: error verificando stream')
      }
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Stream supervisor: error general')
  }
}

async function checkStream(row) {
  const { clientId, icecastMount, enabled, autoRestart } = row
  const proc = await isProcessRunning(icecastMount)

  if (proc.running) {
    resetRecovery(clientId)
    return
  }

  const state = _recovery.get(clientId) || { attempts: 0, misses: 0, nextAttemptAt: 0 }
  state.misses += 1
  _recovery.set(clientId, state)

  if (state.misses < MISSES_BEFORE_RESTART) {
    return
  }

  // Deshabilitado por el admin o detenido a propósito: no reiniciar.
  if (!enabled || !autoRestart) {
    resetRecovery(clientId)
    await markOff(clientId, 'Detenido intencionalmente (no se auto-reinicia)')
    return
  }

  // No cortar una transmisión en vivo ante una detección errónea.
  const harborConnected = await isAnyHarborSourceConnected(row.liquidsoapTelnetPort)
  if (harborConnected === true) {
    logger.warn({ clientId, mount: icecastMount }, 'Stream supervisor: proceso ausente pero harbor conectado — no se reinicia')
    await audit(clientId, 'supervisor_dj_mismatch', { mount: icecastMount })
    return
  }

  const now = Date.now()
  if (state.nextAttemptAt && now < state.nextAttemptAt) {
    return
  }

  if (state.attempts >= MAX_RESTART_ATTEMPTS) {
    logger.warn({ clientId, mount: icecastMount, attempts: state.attempts }, 'Stream supervisor: reintentos agotados — marcando off')
    resetRecovery(clientId)
    await markOff(clientId, `No se pudo recuperar tras ${state.attempts} intentos`)
    await audit(clientId, 'supervisor_gave_up', { mount: icecastMount, attempts: state.attempts })
    return
  }

  state.attempts += 1
  logger.warn({ clientId, mount: icecastMount, attempt: state.attempts }, 'Stream supervisor: proceso no encontrado — reiniciando')
  try {
    const result = await startStream(clientId)
    resetRecovery(clientId)
    await audit(clientId, 'supervisor_auto_restart', { mount: icecastMount, pid: result.pid, attempt: state.attempts })
    logger.info({ clientId, mount: icecastMount, pid: result.pid }, 'Stream supervisor: stream recuperado')
  } catch (err) {
    const delay = RESTART_BACKOFF_MS[Math.min(state.attempts - 1, RESTART_BACKOFF_MS.length - 1)]
    state.nextAttemptAt = Date.now() + delay
    _recovery.set(clientId, state)
    logger.warn(
      { clientId, mount: icecastMount, attempt: state.attempts, delayMs: delay, err: err.message },
      'Stream supervisor: reinicio falló, se reintentará'
    )
  }
}
