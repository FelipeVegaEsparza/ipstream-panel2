// =====================================================
// Especiales: texto con IA, audio con la voz premium y validaciones.
// =====================================================

import { callDeepSeekJson } from '@/lib/deepseek'
import { prisma } from '@/lib/prisma'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { probeAudioBufferDuration } from '@/lib/audio-mix'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'

export const MAX_SPECIAL_TRACKS = 5
export const MAX_SPECIAL_SECONDS = 20
export const MIN_SPECIAL_CHARS = 40
export const MAX_SPECIAL_CHARS = 320

export type SpecialPart = 'intro' | 'closing'

export interface SpecialCollision {
  id: string
  name: string
  position: number
  everyTracks: number
}

export interface SpecialSpeech {
  audio: Buffer
  contentType: string
  provider: 'fish' | 'elevenlabs'
  cached: boolean
  text: string
  seconds: number | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export async function getClientStationName(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, basicData: { select: { projectName: true } } },
  })
  return (client?.basicData?.projectName || client?.name || 'la radio').trim() || 'la radio'
}

export function todayInTimezone(timezone: string | null | undefined, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

export async function getClientTimezone(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { timezone: true },
  })
  return client?.timezone || 'UTC'
}

function cleanStation(name: string | null | undefined): string {
  const raw = (name || '').replace(/\s+/g, ' ').trim() || 'la radio'
  const withoutPunctuation = raw.replace(/[.:;,]+$/, '')
  return withoutPunctuation.charAt(0).toUpperCase() + withoutPunctuation.slice(1)
}

/** Garantiza que el texto hablado empiece con el nombre de la emisora. */
export function ensureStationPrefix(stationName: string | null | undefined, text: string | null | undefined): string {
  const station = cleanStation(stationName)
  const body = (text || '').replace(/\s+/g, ' ').trim()
  if (!body) return station
  if (body.toLowerCase().startsWith(station.toLowerCase())) return body
  const sentence = body.charAt(0).toUpperCase() + body.slice(1)
  return `${station}. ${sentence}`
}

/** Recorta al límite en el último punto completo o en el último espacio. */
export function clampSpecialText(text: string, max: number = MAX_SPECIAL_CHARS): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean

  const slice = clean.slice(0, max)
  const sentenceEnd = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'))
  if (sentenceEnd >= Math.floor(max * 0.4)) {
    return slice.slice(0, sentenceEnd + 1).trim()
  }
  const space = slice.lastIndexOf(' ')
  const cut = space > 0 ? slice.slice(0, space) : slice
  return `${cut.trim().replace(/[.,;:]$/, '')}.`
}

export async function generateSpecialText(input: {
  station: string
  name: string
  artist?: string | null
  description: string
  part: SpecialPart
}): Promise<string | null> {
  const station = cleanStation(input.station)
  const artist = (input.artist || '').trim()
  const name = (input.name || '').trim()
  const description = (input.description || '').replace(/\s+/g, ' ').trim()
  if (!description) return null

  const system = [
    `Sos el locutor de ${station}. Escribís la ${input.part === 'intro' ? 'introducción' : 'despedida'} de un especial de radio.`,
    'Reglas obligatorias:',
    '- Español neutro, oral, 2 o 3 frases. Máximo 280 caracteres.',
    `- Empezá siempre con el nombre de la emisora: "${station}".`,
    input.part === 'intro'
      ? '- Presentá el especial, el artista o tema central y lo que va a escuchar el oyente.'
      : '- Cerrá el especial, agradecé la escucha e invitá a seguir en la radio.',
    '- No inventes fechas, premios, ventas, escándalos, política, religión ni vida privada.',
    '- Sin markdown, sin comillas tipográficas, sin emojis.',
    '- Respondé solo con el texto, sin explicaciones.',
  ].join('\n')

  const user = [
    `Especial: "${name}"`,
    artist ? `Artista o tema central: "${artist}"` : '',
    '',
    'Descripción del cliente:',
    `"""${description.slice(0, 1200)}"""`,
    '',
    'Devolvé un JSON válido:',
    '{ "texto": "la locución lista para leer en voz alta" }',
  ]
    .filter(Boolean)
    .join('\n')

  const data = await callDeepSeekJson<{ texto?: unknown }>(system, user)
  const raw = typeof data?.texto === 'string' ? data.texto : ''
  const text = clampSpecialText(ensureStationPrefix(station, raw))
  if (text.length < MIN_SPECIAL_CHARS) return null
  return text
}

/**
 * Sintetiza intro/cierre con la voz premium y verifica el tope de 20 s.
 * Si se pasa, recorta en el último punto y reintenta una vez.
 */
export async function synthesizeSpecialSpeech(input: {
  clientId: string
  station: string
  text: string
  part: SpecialPart
}): Promise<SpecialSpeech | null> {
  let text = ensureStationPrefix(input.station, input.text)
  const isIntro = input.part === 'intro'

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await synthesizePremiumTts({
      clientId: input.clientId,
      text,
      direction: isIntro ? FISH_AUDIO_DIRECTIONS.specialIntro : FISH_AUDIO_DIRECTIONS.specialClosing,
      closingDirection: isIntro ? FISH_AUDIO_DIRECTIONS.specialIntro : FISH_AUDIO_DIRECTIONS.specialClosing,
    })
    const seconds = await probeAudioBufferDuration(result.audio)
    if (seconds == null || seconds <= MAX_SPECIAL_SECONDS) {
      return { ...result, text, seconds }
    }

    const shorter = clampSpecialText(text, Math.max(MIN_SPECIAL_CHARS, Math.floor(text.length * 0.75)))
    if (!shorter || shorter === text) return null
    text = shorter
  }
  return null
}

// =====================================================
// Validación de colisiones
// =====================================================

export function insertionPositions(everyTracks: number, trackCount: number): number[] {
  if (!Number.isInteger(everyTracks) || everyTracks < 1 || trackCount < 1) return []
  const positions: number[] = []
  for (let position = everyTracks; position <= trackCount; position += everyTracks) {
    positions.push(position)
  }
  return positions
}

function rangesOverlap(
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null
): boolean {
  const aS = aStart || '0000-01-01'
  const aE = aEnd || '9999-12-31'
  const bS = bStart || '0000-01-01'
  const bE = bEnd || '9999-12-31'
  return aS <= bE && bS <= aE
}

/**
 * Busca choques con otros especiales activos en una vuelta de la playlist
 * actual. Dos especiales chocan si ambos caen después del mismo tema normal.
 */
export async function findSpecialCollision(input: {
  clientId: string
  everyTracks: number
  excludeId?: string
  startDate?: string | null
  endDate?: string | null
}): Promise<SpecialCollision[]> {
  const playlist = await prisma.playlist.findFirst({
    where: { clientId: input.clientId, isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { _count: { select: { entries: true } } },
  })
  const trackCount = playlist?._count.entries ?? 0
  if (trackCount < 2) return []

  const ownPositions = new Set(insertionPositions(input.everyTracks, trackCount))
  if (ownPositions.size === 0) return []

  const others = await prisma.radioSpecial.findMany({
    where: {
      clientId: input.clientId,
      active: true,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true, name: true, everyTracks: true, startDate: true, endDate: true },
  })

  const collisions: SpecialCollision[] = []
  for (const other of others) {
    if (!rangesOverlap(input.startDate || null, input.endDate || null, other.startDate, other.endDate)) {
      continue
    }
    const position = insertionPositions(other.everyTracks, trackCount).find((value) =>
      ownPositions.has(value)
    )
    if (position != null) {
      collisions.push({
        id: other.id,
        name: other.name,
        position,
        everyTracks: other.everyTracks,
      })
    }
  }
  return collisions
}
