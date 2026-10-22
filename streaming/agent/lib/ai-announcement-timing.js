// Helpers de tiempo para las locuciones automáticas del AutoDJ.

export const LEAD_SECONDS = 45
export const MIN_LEAD_SECONDS = 10
export const PUSH_BEFORE_SECONDS = 8

/**
 * Normaliza lo que devuelve `autodj.remaining` por telnet. Liquidsoap puede
 * responder "inf" (fallback sin duración) o valores fuera de rango.
 */
export function parseRemaining(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0 || value > 6 * 60 * 60) return null
  return value
}

/** Remaining estimado a partir de la duración del tema y su hora de inicio. */
export function estimateRemaining(durationSeconds, startedMs, nowMs = Date.now()) {
  const duration = Number(durationSeconds)
  const started = Number(startedMs)
  if (!Number.isFinite(duration) || duration <= 0) return null
  if (!Number.isFinite(started)) return null
  const elapsed = (nowMs - started) / 1000
  if (elapsed < 0) return null
  const remaining = duration - elapsed
  return remaining > 0 ? remaining : null
}

/** Instante del próximo corte de tema para el que se prepara la locución. */
export function announcementTarget(remainingSeconds, nowMs = Date.now()) {
  return new Date(nowMs + Number(remainingSeconds) * 1000)
}
