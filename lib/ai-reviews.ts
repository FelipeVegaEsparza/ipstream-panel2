// =====================================================
// Reseñas IA — dato corto del artista o del tema
// =====================================================
// El texto lo redacta DeepSeek y se cachea por cliente + artista + título +
// estilo. El audio se sintetiza con la voz premium de la radio y se acota a
// 20 segundos. Solo el TTS consume cuota: el texto no se descuenta.

import { callDeepSeekJson } from '@/lib/deepseek'
import { sanitizeArtist, sanitizeTrackTitle } from '@/lib/track-text'
import { prisma } from '@/lib/prisma'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { probeAudioBufferDuration } from '@/lib/audio-mix'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'

export const REVIEW_STYLES = [
  'dato-curioso',
  'detras-de-la-cancion',
  'contexto-historico',
  'biografia',
] as const

export type ReviewStyle = (typeof REVIEW_STYLES)[number]

export const DEFAULT_REVIEW_STYLE: ReviewStyle = 'dato-curioso'
export const MAX_REVIEW_CHARS = 320
export const MIN_REVIEW_CHARS = 40
export const MAX_REVIEW_SECONDS = 20

export type ReviewType = 'descriptivo' | 'historico' | 'biografico'

export interface ReviewTrack {
  artist: string
  title: string
}

export interface ReviewKeys {
  artist: string
  title: string
  artistKey: string
  titleKey: string
}

export interface ReviewCandidate {
  text: string
  type: ReviewType
  safe: boolean
}

export interface ReviewAudio {
  audio: Buffer
  contentType: string
  provider: 'fish' | 'elevenlabs'
  cached: boolean
  text: string
  seconds: number | null
}

export function isReviewStyle(value: unknown): value is ReviewStyle {
  return typeof value === 'string' && (REVIEW_STYLES as readonly string[]).includes(value)
}

/**
 * Clave de cache: sin acentos, minúsculas, sin puntuación.
 * "Soda Stereo" y "soda  stereo" comparten fila.
 */
export function normalizeReviewKey(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 191)
}

export function buildReviewKeys(artist: string | null | undefined, title: string | null | undefined): ReviewKeys {
  const cleanArtist = sanitizeArtist(artist) || (artist || '').trim()
  const cleanTitle = sanitizeTrackTitle(title, artist) || (title || '').trim()
  return {
    artist: cleanArtist.slice(0, 300),
    title: cleanTitle.slice(0, 300),
    artistKey: normalizeReviewKey(cleanArtist),
    titleKey: normalizeReviewKey(cleanTitle),
  }
}

// =====================================================
// Política de contenido
// =====================================================

const MONTHS = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre'

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\b(?:1[89]\d{2}|20\d{2})\b/, // años exactos
  new RegExp(`\\b\\d{1,2}\\s+de\\s+(?:${MONTHS})\\b`, 'i'),
  /\b(?:vendio|vendieron|millones de copias|disco de (?:oro|platino)|grammy|billboard|numero uno|top\s?\d+)\b/i,
  /\b(?:murio|fallecio|muerte|asesinad[oa]|escandalo|drogadiccion|sobredosis|carcel|demando|condena)\b/i,
  /\b(?:politic[ao]s?|religion|religios[ao]s?|presidente|iglesia)\b/i,
  /\b(?:suicidio|abuso|cancer|enfermedad)\b/i,
]

function normalizeForMatch(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Texto con datos que la política prohíbe (fechas, cifras, temas sensibles). */
export function containsForbiddenContent(text: string): boolean {
  const normalized = normalizeForMatch(text)
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(normalized))
}

/**
 * Recorta el texto al límite en el último punto completo. Si no hay punto
 * útil, corta en el último espacio para no dejar una palabra a medias.
 */
export function clampReviewText(text: string, max: number = MAX_REVIEW_CHARS): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean

  const slice = clean.slice(0, max)
  const sentenceEnd = Math.max(
    slice.lastIndexOf('.'),
    slice.lastIndexOf('!'),
    slice.lastIndexOf('?')
  )
  if (sentenceEnd >= Math.floor(max * 0.4)) {
    return slice.slice(0, sentenceEnd + 1).trim()
  }

  const space = slice.lastIndexOf(' ')
  const cut = space > 0 ? slice.slice(0, space) : slice
  return `${cut.trim().replace(/[.,;:]$/, '')}.`
}

function styleInstruction(style: ReviewStyle): string {
  switch (style) {
    case 'detras-de-la-cancion':
      return 'Contá cómo nació el tema o qué lo inspiró: SOLO si estás completamente seguro. Si dudás, contá de qué habla la letra.'
    case 'contexto-historico':
      return 'Ubicá el tema en su época y su escena musical (país, movimiento, momento). Sin fechas ni años exactos.'
    case 'biografia':
      return 'Presentá al artista: de dónde es, qué lo distingue y su trayectoria general. Sin fechas ni premios.'
    case 'dato-curioso':
    default:
      return 'Contá un dato concreto y de bajo riesgo: instrumentación, estructura, ritmo, cómo suena, un detalle que se note al escuchar.'
  }
}

export function buildReviewPrompt(
  style: ReviewStyle,
  track: ReviewTrack,
  hasIntro: boolean,
  forceDescriptive = false
): { system: string; user: string } {
  const system = [
    'Sos el locutor de una radio. Escribís una reseña breve que se escucha antes de una canción.',
    'Reglas obligatorias:',
    '- Español neutro, oral, entre 2 y 3 frases. Máximo 320 caracteres.',
    '- Priorizá lo descriptivo: género, época, instrumentación, ritmo, mood, tema de la letra, cómo suena.',
    '- Solo usá historia o biografía si estás completamente seguro. Si dudás, describí la canción.',
    '- PROHIBIDO: años o fechas exactas, posiciones en listas, premios, cifras de venta, anécdotas puntuales, muerte, escándalos, política, religión, vida privada.',
    '- Sin markdown, sin comillas tipográficas, sin emojis.',
    '- No repitas el nombre del tema más de una vez.',
  ].join('\n')

  const user = [
    `Artista: "${track.artist}"`,
    track.title ? `Tema: "${track.title}"` : 'Tema: (solo el artista, sin tema puntual)',
    '',
    `Estilo pedido: ${style}.`,
    styleInstruction(style),
    '',
    hasIntro
      ? 'La presentación ya nombró el tema y al artista, así que arrancá con un conector corto ("Un dato:", "¿Sabías que…?", "Detrás de esta canción…").'
      : 'No hubo presentación: nombrá el tema y al artista en la primera frase ("Se viene «…» de …").',
    forceDescriptive
      ? 'IMPORTANTE: la respuesta anterior no fue válida. Esta vez sé 100% descriptivo: nada de historia, fechas, premios ni anécdotas.'
      : '',
    '',
    'Respondé EXCLUSIVAMENTE con un JSON válido:',
    '{',
    '  "texto": "la reseña lista para leer en voz alta",',
    '  "tipo": "descriptivo" | "historico" | "biografico",',
    '  "seguro": true | false',
    '}',
    'Usá "seguro": false si no estás completamente seguro de un dato histórico o biográfico.',
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}

export function parseReviewResponse(data: unknown): ReviewCandidate | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>
  const text = typeof raw.texto === 'string' ? raw.texto.replace(/\s+/g, ' ').trim() : ''
  if (text.length < MIN_REVIEW_CHARS) return null

  const type: ReviewType =
    raw.tipo === 'historico' || raw.tipo === 'biografico' ? raw.tipo : 'descriptivo'
  const safe = raw.seguro === true

  if (type !== 'descriptivo' && !safe) return null
  if (containsForbiddenContent(text)) return null

  return { text: clampReviewText(text), type, safe }
}

// =====================================================
// Generación de texto
// =====================================================

export async function generateReviewText(input: {
  artist: string
  title: string
  style: ReviewStyle
  hasIntro: boolean
}): Promise<ReviewCandidate | null> {
  const track: ReviewTrack = { artist: input.artist, title: input.title }

  for (let attempt = 1; attempt <= 2; attempt++) {
    const style = attempt === 1 ? input.style : DEFAULT_REVIEW_STYLE
    const prompt = buildReviewPrompt(style, track, input.hasIntro, attempt > 1)
    const data = await callDeepSeekJson<unknown>(prompt.system, prompt.user)
    const candidate = parseReviewResponse(data)
    if (candidate) return candidate
  }

  return null
}

// =====================================================
// Banco de reseñas (por cliente)
// =====================================================

export interface ReviewRecord {
  id: string
  kind: string
  artist: string
  title: string
  style: string
  text: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/** Fila del banco sin filtrar por `active` (para respetar una desactivación). */
export async function getReviewRecord(input: {
  clientId: string
  artist: string
  title: string
  style: ReviewStyle
}): Promise<ReviewRecord | null> {
  const keys = buildReviewKeys(input.artist, input.title)
  if (!keys.artistKey || !keys.titleKey) return null
  return findReview(input.clientId, 'track', keys.artistKey, keys.titleKey, input.style)
}

/** Fila de biografía del artista sin filtrar por `active`. */
export async function getArtistReviewRecord(input: {
  clientId: string
  artist: string
  style: ReviewStyle
}): Promise<ReviewRecord | null> {
  const keys = buildReviewKeys(input.artist, '')
  if (!keys.artistKey) return null
  return findReview(input.clientId, 'artist', keys.artistKey, '', 'biografia')
}

export async function getOrCreateReview(input: {
  clientId: string
  artist: string
  title: string
  style: ReviewStyle
  hasIntro: boolean
}): Promise<ReviewRecord | null> {
  const keys = buildReviewKeys(input.artist, input.title)
  if (!keys.artistKey || !keys.titleKey) return null

  const existing = await findReview(input.clientId, 'track', keys.artistKey, keys.titleKey, input.style)
  if (existing) return existing.active ? existing : null

  const candidate = await generateReviewText({
    artist: keys.artist,
    title: keys.title,
    style: input.style,
    hasIntro: input.hasIntro,
  })
  if (!candidate) return null

  return createReview({
    clientId: input.clientId,
    kind: 'track',
    keys,
    style: input.style,
    text: candidate.text,
  })
}

/**
 * Respaldo cuando no hay dato del tema: una bio corta del artista.
 * Solo se usa si el tema no pudo generar reseña.
 */
export async function getOrCreateArtistReview(input: {
  clientId: string
  artist: string
  style: ReviewStyle
  hasIntro: boolean
}): Promise<ReviewRecord | null> {
  const keys = buildReviewKeys(input.artist, '')
  if (!keys.artistKey) return null

  const existing = await findReview(input.clientId, 'artist', keys.artistKey, '', 'biografia')
  if (existing) return existing.active ? existing : null

  const candidate = await generateReviewText({
    artist: keys.artist,
    title: '',
    style: 'biografia',
    hasIntro: input.hasIntro,
  })
  if (!candidate) return null

  return createReview({
    clientId: input.clientId,
    kind: 'artist',
    keys: { ...keys, title: '', titleKey: '' },
    style: 'biografia',
    text: candidate.text,
  })
}

async function findReview(
  clientId: string,
  kind: string,
  artistKey: string,
  titleKey: string,
  style: string
): Promise<ReviewRecord | null> {
  return prisma.aiReview.findUnique({
    where: {
      clientId_kind_artistKey_titleKey_style: { clientId, kind, artistKey, titleKey, style },
    },
  })
}

async function createReview(input: {
  clientId: string
  kind: string
  keys: ReviewKeys
  style: string
  text: string
}): Promise<ReviewRecord | null> {
  try {
    return await prisma.aiReview.create({
      data: {
        clientId: input.clientId,
        kind: input.kind,
        artist: input.keys.artist,
        title: input.keys.title,
        artistKey: input.keys.artistKey,
        titleKey: input.keys.titleKey,
        style: input.style,
        text: input.text,
      },
    })
  } catch (err) {
    // Carrera con otra generación del mismo tema: devolvemos la fila existente.
    const existing = await findReview(
      input.clientId,
      input.kind,
      input.keys.artistKey,
      input.keys.titleKey,
      input.style
    )
    if (existing) return existing
    console.error('[ai-reviews] no se pudo guardar la reseña:', err)
    return null
  }
}

export interface ClientReviewConfig {
  everyTracks: number
  style: ReviewStyle
  adminEnabled: boolean
}

export async function getClientReviewConfig(clientId: string): Promise<ClientReviewConfig | null> {
  const rs = await prisma.radioStream.findUnique({
    where: { clientId },
    select: { aiReviewEveryTracks: true, aiReviewStyle: true, aiReviewAdminEnabled: true },
  })
  if (!rs) return null
  return {
    everyTracks: rs.aiReviewEveryTracks,
    style: isReviewStyle(rs.aiReviewStyle) ? rs.aiReviewStyle : DEFAULT_REVIEW_STYLE,
    adminEnabled: rs.aiReviewAdminEnabled,
  }
}

export async function listClientReviews(clientId: string, style?: string): Promise<ReviewRecord[]> {
  return prisma.aiReview.findMany({
    where: { clientId, ...(style ? { style } : {}) },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  })
}

export async function setReviewActive(
  clientId: string,
  id: string,
  active: boolean
): Promise<boolean> {
  const result = await prisma.aiReview.updateMany({
    where: { id, clientId },
    data: { active },
  })
  return result.count > 0
}

export async function regenerateReview(
  clientId: string,
  id: string
): Promise<ReviewRecord | null> {
  const row = await prisma.aiReview.findFirst({ where: { id, clientId } })
  if (!row) return null

  const style = isReviewStyle(row.style) ? row.style : DEFAULT_REVIEW_STYLE
  const candidate = await generateReviewText({
    artist: row.artist,
    title: row.title,
    style,
    hasIntro: true,
  })
  if (!candidate) return null

  return prisma.aiReview.update({
    where: { id: row.id },
    data: { text: candidate.text, active: true },
  })
}

// =====================================================
// Audio
// =====================================================

/**
 * Sintetiza la reseña con la voz premium y verifica el tope de 20 s.
 * Si se pasa, recorta el texto en el último punto y reintenta una vez.
 * Devuelve null si aun así no entra (la reseña se descarta).
 */
export async function synthesizeReviewWithLimit(input: {
  clientId: string
  text: string
}): Promise<ReviewAudio | null> {
  let text = input.text
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await synthesizePremiumTts({
      clientId: input.clientId,
      text,
      direction: FISH_AUDIO_DIRECTIONS.review,
      closingDirection: FISH_AUDIO_DIRECTIONS.reviewClosing,
    })
    const seconds = await probeAudioBufferDuration(result.audio)
    if (seconds == null || seconds <= MAX_REVIEW_SECONDS) {
      return { ...result, text, seconds }
    }

    const shorter = clampReviewText(text, Math.max(MIN_REVIEW_CHARS, Math.floor(text.length * 0.75)))
    if (!shorter || shorter === text) return null
    text = shorter
  }
  return null
}
