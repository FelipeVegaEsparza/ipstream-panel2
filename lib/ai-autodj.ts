// =====================================================
// Preparación de locuciones IA por playlist.
// Genera una intro por bloque (cada N temas) con la voz premium del cliente,
// las sube al agente en el set de esa playlist y lo deja listo para el AutoDJ.
//
// La generación es idempotente: se guarda un hash del contenido (temas/orden,
// frecuencia, frases y voz) en `Playlist.aiIntrosKey`. Si nada cambió, se
// omite y no consume cuota.
// =====================================================

import { prisma } from './prisma'
import { getAiLiveAccess, consumeAiCharacters } from './ai-live'
import { synthesizePremiumTts, hasConfiguredPremiumTts } from './premium-tts'
import { streamingClient } from './streaming-client'
import { buildPresenterText, normalizePhrases } from './live-console/presenter'
import { FISH_AUDIO_DIRECTIONS } from './fish-audio-directions'
import { computePlaylistIntrosKey, type PlaylistIntrosKeyInput } from './ai-intros-key'

export { computePlaylistIntrosKey }
export type { PlaylistIntrosKeyInput }

export const MAX_INTROS = 80
const AI_JINGLE_ARTIST = 'Locutor IA'
const MAX_ERROR_CHARS = 2000

export class AiAutodjError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status = 400) {
    super(message)
    this.name = 'AiAutodjError'
    this.code = code
    this.status = status
  }
}

function parsePhrases(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : []
  } catch {
    return []
  }
}

export interface PlaylistSnapshot {
  playlist: {
    id: string
    name: string
    shuffle: boolean
    trackCount: number
    aiIntrosKey: string | null
    aiIntrosReadyAt: Date | null
  }
  entries: Array<{
    track: { id: string; title: string | null; artist: string | null; fileName: string }
  }>
  station: string
  every: number
  phrases: string[]
  key: string
}

/**
 * Carga la playlist (o la activa si no se indica) y todo lo necesario para
 * calcular su set de locuciones. Devuelve `null` si no existe.
 */
export async function loadPlaylistSnapshot(
  clientId: string,
  playlistId?: string | null,
  everyOverride?: number
): Promise<PlaylistSnapshot | null> {
  const playlist = await prisma.playlist.findFirst({
    where: playlistId ? { id: playlistId, clientId } : { clientId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: {
      entries: {
        orderBy: { order: 'asc' },
        include: {
          track: { select: { id: true, title: true, artist: true, fileName: true } },
        },
      },
    },
  })
  if (!playlist) return null

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      name: true,
      basicData: { select: { projectName: true } },
      radioStream: {
        select: {
          aiPresenterEvery: true,
          aiIntroPhrases: true,
          aiVoiceId: true,
          fishVoiceId: true,
          aiVoiceStyle: true,
          aiVoicePreset: true,
        },
      },
    },
  })
  const rs = client?.radioStream
  const station = client?.basicData?.projectName || client?.name || 'la radio'
  const every = Number(everyOverride) || Number(rs?.aiPresenterEvery) || 3
  const phrases = normalizePhrases(parsePhrases(rs?.aiIntroPhrases))
  const key = computePlaylistIntrosKey({
    station,
    every,
    phrases,
    trackIds: playlist.entries.map((entry) => entry.track.id),
    aiVoiceId: rs?.aiVoiceId ?? null,
    fishVoiceId: rs?.fishVoiceId ?? null,
    aiVoiceStyle: rs?.aiVoiceStyle ?? 0,
    aiVoicePreset: rs?.aiVoicePreset ?? null,
  })

  return {
    playlist: {
      id: playlist.id,
      name: playlist.name,
      shuffle: playlist.shuffle,
      trackCount: playlist.trackCount,
      aiIntrosKey: playlist.aiIntrosKey,
      aiIntrosReadyAt: playlist.aiIntrosReadyAt,
    },
    entries: playlist.entries.map((entry) => ({ track: entry.track })),
    station,
    every,
    phrases,
    key,
  }
}

export interface PrepareIntrosResult {
  playlistId: string
  playlistName: string
  skipped: boolean
  generated: number
  every: number
  totalCharacters: number
  remaining: number
  playlistTracks: number
}

const inFlight = new Map<string, Promise<PrepareIntrosResult>>()

/**
 * Genera el set de locuciones de una playlist. Con `force` regenera aunque el
 * hash coincida (acción manual "Aplicar al AutoDJ"). Si ya hay una generación
 * en curso para la misma playlist, devuelve esa misma promesa.
 */
export function preparePlaylistIntros(input: {
  clientId: string
  playlistId?: string | null
  every?: number
  force?: boolean
  consumeQuota?: boolean
}): Promise<PrepareIntrosResult> {
  const lockKey = `${input.clientId}:${input.playlistId || 'active'}`
  const existing = inFlight.get(lockKey)
  if (existing) return existing
  const promise = doPreparePlaylistIntros(input).finally(() => {
    inFlight.delete(lockKey)
  })
  inFlight.set(lockKey, promise)
  return promise
}

async function doPreparePlaylistIntros(input: {
  clientId: string
  playlistId?: string | null
  every?: number
  force?: boolean
  consumeQuota?: boolean
}): Promise<PrepareIntrosResult> {
  const snapshot = await loadPlaylistSnapshot(input.clientId, input.playlistId, input.every)
  if (!snapshot) {
    throw new AiAutodjError('no_playlist', 'No hay una playlist con temas para preparar.', 400)
  }
  const { playlist, entries, station, phrases } = snapshot
  const every = Number(input.every) || snapshot.every
  if (!Number.isInteger(every) || every < 2 || every > 10) {
    throw new AiAutodjError('invalid_every', 'La frecuencia debe ser un entero entre 2 y 10.', 400)
  }
  if (entries.length === 0) {
    throw new AiAutodjError('no_playlist', 'No hay una playlist activa con temas.', 400)
  }
  if (playlist.shuffle) {
    throw new AiAutodjError(
      'shuffle_not_supported',
      'Desactivá “Aleatorio” en la playlist para usar el presentador IA en el AutoDJ.',
      400
    )
  }

  const count = Math.floor((entries.length - 1) / every)
  if (count <= 0) {
    throw new AiAutodjError(
      'playlist_too_short',
      'La playlist no tiene suficientes temas para esa frecuencia.',
      400
    )
  }
  if (count > MAX_INTROS) {
    throw new AiAutodjError(
      'too_many_intros',
      `La playlist generaría ${count} intros (máximo ${MAX_INTROS}). Subí la frecuencia o reducí la playlist.`,
      400
    )
  }

  if (!input.force && playlist.aiIntrosKey === snapshot.key && playlist.aiIntrosReadyAt) {
    const access = await getAiLiveAccess(input.clientId)
    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      skipped: true,
      generated: 0,
      every,
      totalCharacters: 0,
      remaining: access.remaining,
      playlistTracks: entries.length,
    }
  }

  const access = await getAiLiveAccess(input.clientId)
  if (!access.enabled) {
    throw new AiAutodjError('ai_not_included', 'Tu plan no incluye IA en vivo.', 403)
  }
  if (!(await hasConfiguredPremiumTts())) {
    throw new AiAutodjError(
      'tts_not_configured',
      'Configurá ElevenLabs o Fish Audio en Locución.',
      503
    )
  }

  const targets = []
  for (let k = 1; k <= count; k++) {
    targets.push(entries[k * every].track)
  }
  const texts = targets.map((track) => buildPresenterText(station, track, phrases))
  const totalChars = texts.reduce((sum, text) => sum + text.length, 0)
  if (totalChars > access.remaining) {
    throw new AiAutodjError(
      'ai_quota_exceeded',
      `La preparación necesita ${totalChars} caracteres y te quedan ${access.remaining}.`,
      402
    )
  }

  const consumeQuota = input.consumeQuota !== false
  let remaining = access.remaining
  let generated = 0

  try {
    // Se arma en staging y se promueve al final: la playlist activa conserva
    // su set anterior hasta que el nuevo está completo.
    await streamingClient.clearAiIntros(input.clientId, playlist.id, { staging: true })

    for (let i = 0; i < targets.length; i++) {
      const text = texts[i]
      const track = targets[i]
      const audio = await synthesizePremiumTts({
        clientId: input.clientId,
        text,
        direction: FISH_AUDIO_DIRECTIONS.presenter,
        closingDirection: FISH_AUDIO_DIRECTIONS.presenterClosing,
      })
      if (!audio.cached && consumeQuota) {
        try {
          await consumeAiCharacters(input.clientId, text.length, 'autodj-presenter')
        } catch (err) {
          console.error('[ai-autodj] no se pudo registrar la cuota:', err)
        }
        remaining = Math.max(0, remaining - text.length)
      }

      const fileName = `ia-${String(i + 1).padStart(4, '0')}-${track.id}.mp3`
      const file = new File([new Uint8Array(audio.audio)], fileName, { type: 'audio/mpeg' })
      await streamingClient.uploadAiIntro(input.clientId, file, playlist.id, { staging: true })
      generated++
    }

    await streamingClient.promoteAiIntros(input.clientId, playlist.id)
  } catch (err) {
    await streamingClient
      .clearAiIntros(input.clientId, playlist.id, { staging: true })
      .catch(() => undefined)
    await prisma.playlist
      .update({
        where: { id: playlist.id },
        data: {
          aiIntrosAttemptAt: new Date(),
          aiIntrosError: (err instanceof Error ? err.message : String(err)).slice(0, MAX_ERROR_CHARS),
        },
      })
      .catch(() => undefined)
    throw err
  }

  await prisma.playlist.update({
    where: { id: playlist.id },
    data: {
      aiIntrosKey: snapshot.key,
      aiIntrosReadyAt: new Date(),
      aiIntrosAttemptAt: new Date(),
      aiIntrosError: null,
    },
  })

  // Mantiene la configuración del stream alineada con lo generado (el panel
  // ya la guarda antes de aplicar, pero la API acepta `every` explícito).
  await prisma.radioStream
    .update({
      where: { clientId: input.clientId },
      data: { aiPresenterEnabled: true, aiPresenterEvery: every },
    })
    .catch(() => undefined)

  return {
    playlistId: playlist.id,
    playlistName: playlist.name,
    skipped: false,
    generated,
    every,
    totalCharacters: totalChars,
    remaining,
    playlistTracks: entries.length,
  }
}

/** Limpieza del esquema anterior basado en jingles. Idempotente. */
export async function cleanupLegacyAiJingles(clientId: string): Promise<void> {
  try {
    const existing = await streamingClient.listJingles(clientId)
    const jingles = Array.isArray(existing?.jingles) ? existing.jingles : []
    const aiJingles = jingles.filter((j: { artist?: string | null }) => j.artist === AI_JINGLE_ARTIST)
    const normalJingles = jingles.filter((j: { artist?: string | null }) => j.artist !== AI_JINGLE_ARTIST)
    for (const jingle of aiJingles) {
      if (jingle.id) {
        try {
          await streamingClient.deleteJingle(clientId, jingle.id)
        } catch (err) {
          console.warn('[ai-autodj] no se pudo borrar jingle IA legado', jingle.id, err)
        }
      }
    }
    if (aiJingles.length > 0 && normalJingles.length === 0) {
      try {
        await streamingClient.updateJingleConfig(clientId, 5, 1)
      } catch (err) {
        console.warn('[ai-autodj] no se pudo restaurar jinglePlayEvery', err)
      }
    }
  } catch (err) {
    console.warn('[ai-autodj] no se pudieron limpiar jingles IA legados', err)
  }
}
