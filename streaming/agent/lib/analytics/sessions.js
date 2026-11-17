// =====================================================
// Analytics — consolidador de sesiones de TV
// =====================================================
// Una sesión de visualización no es cada recarga del manifiesto HLS: es un
// espectador (IP + stream) que sigue reproduciendo sin superar una ventana de
// inactividad. Este tracker mantiene ese estado en memoria y decide cuándo
// crear una sesión nueva y cuándo actualizar la existente.

import { makeSignature } from './parse.js'

const DEFAULT_GAP_SECONDS = 300
const DEFAULT_UPDATE_INTERVAL_SECONDS = 30

export class ViewerSessionTracker {
  constructor({
    gapSeconds = DEFAULT_GAP_SECONDS,
    updateIntervalSeconds = DEFAULT_UPDATE_INTERVAL_SECONDS,
    now = () => Date.now(),
  } = {}) {
    this.gapMs = Math.max(1, gapSeconds) * 1000
    this.updateIntervalMs = Math.max(0, updateIntervalSeconds) * 1000
    this.now = now
    this.sessions = new Map()
  }

  get size() {
    return this.sessions.size
  }

  /**
   * Procesa un evento de reproducción.
   * @returns {{ start?: object, update?: object }} La sesión a insertar o actualizar.
   */
  ingest(event) {
    const startedAt =
      event?.startedAt instanceof Date ? event.startedAt : new Date(Number(event?.startedAt))
    const ts = startedAt.getTime()
    if (!Number.isFinite(ts)) return {}

    const key = `${event.ip}|${event.streamKey}`
    const existing = this.sessions.get(key)

    if (!existing || ts - existing.lastSeen > this.gapMs) {
      const session = {
        clientId: event.clientId,
        streamId: event.streamId,
        streamKey: event.streamKey,
        ip: event.ip,
        userAgent: event.userAgent || null,
        startedAt,
        lastSeen: ts,
        bytes: Number(event.bytes) || 0,
        durationSeconds: 0,
        lastPersistedAt: this.now(),
        signature: makeSignature([event.ip, event.streamKey, startedAt.toISOString()]),
      }
      this.sessions.set(key, session)
      return { start: session }
    }

    existing.lastSeen = Math.max(existing.lastSeen, ts)
    existing.bytes += Number(event.bytes) || 0
    existing.durationSeconds = Math.max(
      0,
      Math.round((existing.lastSeen - existing.startedAt.getTime()) / 1000)
    )

    if (this.now() - existing.lastPersistedAt >= this.updateIntervalMs) {
      existing.lastPersistedAt = this.now()
      return { update: existing }
    }
    return {}
  }

  /** Descarta sesiones que ya no tuvieron actividad reciente. */
  prune(now = this.now()) {
    for (const [key, session] of this.sessions) {
      if (now - session.lastSeen > this.gapMs * 2) this.sessions.delete(key)
    }
  }

  clear() {
    this.sessions.clear()
  }
}
