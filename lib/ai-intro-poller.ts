// =====================================================
// AI intro poller — prepara las locuciones de las playlists programadas
// antes de que empiece su franja (ver instrumentation.ts).
//
// Solo actúa si el cliente tiene el presentador IA activo. Es idempotente:
// compara el hash del contenido con `Playlist.aiIntrosKey` y no regenera si
// nada cambió. Si falla (cuota, TTS, agente), reintenta después de 15 min.
// =====================================================

import { prisma } from './prisma'
import { getAiLiveAccess } from './ai-live'
import { loadPlaylistSnapshot, preparePlaylistIntros } from './ai-autodj'
import { minutesUntilSlot } from './schedule-window'

const INTERVAL_MS = 2 * 60_000
const LOOKAHEAD_MINUTES = 45
const RETRY_AFTER_ERROR_MS = 15 * 60_000

let started = false
let timer: ReturnType<typeof setInterval> | null = null
let running = false

interface Candidate {
  clientId: string
  playlistId: string
  playlistName: string
  aiIntrosReadyAt: Date | null
  aiIntrosAttemptAt: Date | null
}

async function collectCandidates(now: Date): Promise<Candidate[]> {
  const schedules = await prisma.playlistSchedule.findMany({
    where: { isActive: true },
    select: {
      clientId: true,
      playlistId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      client: {
        select: {
          timezone: true,
          radioStream: { select: { aiPresenterEnabled: true, enabled: true } },
        },
      },
      playlist: {
        select: {
          id: true,
          name: true,
          shuffle: true,
          aiIntrosReadyAt: true,
          aiIntrosAttemptAt: true,
        },
      },
    },
  })

  const byPlaylist = new Map<string, Candidate>()
  for (const slot of schedules) {
    const rs = slot.client.radioStream
    if (!rs?.aiPresenterEnabled || !rs.enabled) continue
    if (slot.playlist.shuffle) continue
    if (minutesUntilSlot(slot, now, slot.client.timezone, LOOKAHEAD_MINUTES) === null) continue

    const key = `${slot.clientId}:${slot.playlistId}`
    if (byPlaylist.has(key)) continue
    byPlaylist.set(key, {
      clientId: slot.clientId,
      playlistId: slot.playlistId,
      playlistName: slot.playlist.name,
      aiIntrosReadyAt: slot.playlist.aiIntrosReadyAt,
      aiIntrosAttemptAt: slot.playlist.aiIntrosAttemptAt,
    })
  }
  return [...byPlaylist.values()]
}

function inErrorBackoff(candidate: Candidate, now: Date): boolean {
  if (!candidate.aiIntrosAttemptAt) return false
  if (candidate.aiIntrosReadyAt) return false
  return now.getTime() - candidate.aiIntrosAttemptAt.getTime() < RETRY_AFTER_ERROR_MS
}

async function prepareCandidate(candidate: Candidate): Promise<void> {
  const snapshot = await loadPlaylistSnapshot(candidate.clientId, candidate.playlistId)
  if (!snapshot) return
  if (snapshot.playlist.shuffle) return
  if (snapshot.playlist.aiIntrosKey === snapshot.key && snapshot.playlist.aiIntrosReadyAt) {
    return
  }

  const access = await getAiLiveAccess(candidate.clientId)
  if (!access.enabled || access.remaining <= 0) return

  const result = await preparePlaylistIntros({
    clientId: candidate.clientId,
    playlistId: candidate.playlistId,
  })
  console.log(
    `[ai-intro-poller] ${candidate.clientId}/${candidate.playlistId} (${candidate.playlistName}): ` +
      `generadas ${result.generated}, restantes ${result.remaining}`
  )
}

export async function tickAiIntroPoller(now = new Date()): Promise<void> {
  const candidates = await collectCandidates(now)
  for (const candidate of candidates) {
    if (inErrorBackoff(candidate, now)) continue
    try {
      await prepareCandidate(candidate)
    } catch (err) {
      console.warn(
        `[ai-intro-poller] falló ${candidate.clientId}/${candidate.playlistId}:`,
        err instanceof Error ? err.message : err
      )
    }
  }
}

/**
 * Dispara la preparación de una playlist recién programada, sin esperar al
 * ciclo periódico. No bloquea la respuesta del endpoint que la llama.
 */
export async function prepareScheduledPlaylistNow(
  clientId: string,
  playlistId: string
): Promise<void> {
  try {
    const [rs, playlist] = await Promise.all([
      prisma.radioStream.findUnique({
        where: { clientId },
        select: { aiPresenterEnabled: true, enabled: true },
      }),
      prisma.playlist.findFirst({
        where: { id: playlistId, clientId },
        select: { shuffle: true, aiIntrosReadyAt: true, aiIntrosAttemptAt: true },
      }),
    ])
    if (!rs?.aiPresenterEnabled || !rs.enabled) return
    if (!playlist || playlist.shuffle) return

    const now = new Date()
    if (
      playlist.aiIntrosAttemptAt &&
      !playlist.aiIntrosReadyAt &&
      now.getTime() - playlist.aiIntrosAttemptAt.getTime() < RETRY_AFTER_ERROR_MS
    ) {
      return
    }

    const access = await getAiLiveAccess(clientId)
    if (!access.enabled || access.remaining <= 0) return

    const snapshot = await loadPlaylistSnapshot(clientId, playlistId)
    if (!snapshot) return
    if (snapshot.playlist.aiIntrosKey === snapshot.key && snapshot.playlist.aiIntrosReadyAt) {
      return
    }
    await preparePlaylistIntros({ clientId, playlistId })
  } catch (err) {
    console.warn(
      `[ai-intro-poller] no se pudo preparar ${clientId}/${playlistId}:`,
      err instanceof Error ? err.message : err
    )
  }
}

export function startAiIntroPoller(): void {
  if (started) return
  started = true

  const run = async () => {
    if (running) return
    running = true
    try {
      await tickAiIntroPoller()
    } catch (err) {
      console.error('[ai-intro-poller]', err)
    } finally {
      running = false
    }
  }

  // Primera pasada poco después del boot (deja terminar migraciones/health).
  setTimeout(() => {
    void run()
  }, 20_000)
  timer = setInterval(() => {
    void run()
  }, INTERVAL_MS)
  timer.unref?.()
}

export function stopAiIntroPoller(): void {
  if (timer) clearInterval(timer)
  timer = null
  started = false
}
