// =====================================================
// ElevenLabs TTS + cache persistente de audios generados
// =====================================================
// El cache vive en el volumen app_uploads (public/uploads/tts-cache), así
// sobrevive a los deploys. Hay dos capas: raw (respuesta de ElevenLabs) y
// procesada (post-proceso FFmpeg). La clave incluye modelo, voz, preset,
// formato, diccionario, idioma y texto.

import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import {
  resolveTtsQuality,
  ttsQualityCacheToken,
  type ResolvedTtsQuality,
} from './tts-quality'

const execFileAsync = promisify(execFile)

export interface ElevenLabsTtsResult {
  audio: Buffer
  contentType: string
  cached: boolean
}

export interface ElevenLabsTtsInput {
  text: string
  apiKey: string
  voiceId: string
  model: string
  cacheEnabled: boolean
  style?: number
  legacyStyle?: number
  language?: string
  quality?: ResolvedTtsQuality
  pronunciationDictionaryId?: string | null
  pronunciationDictionaryVersionId?: string | null
  postProcess?: boolean
}

export const VOICE_POST_PROCESS_VERSION = 'v1'
export const VOICE_POST_PROCESS_BITRATE = '192k'
export const VOICE_POST_PROCESS_FILTER = [
  'highpass=f=80',
  'equalizer=f=3000:t=q:w=1:g=2',
  'acompressor=threshold=-18dB:ratio=2.5:attack=5:release=80',
  'loudnorm=I=-16:TP=-1.5:LRA=11',
  'alimiter=limit=0.95',
].join(',')

const RAW_FORMAT = 'mp3_44100_192'
const FALLBACK_FORMAT = 'mp3_44100_128'

const CACHE_ROOT =
  process.env.TTS_CACHE_DIR?.trim() ||
  path.join(process.cwd(), 'public', 'uploads', 'tts-cache')

const inflight = new Map<string, Promise<ElevenLabsTtsResult>>()

const PRONUNCIATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bAI\b/g, 'IA'],
  [/\bLive\b/gi, 'laiv'],
  [/\bOnline\b/gi, 'onlain'],
  [/\bStreaming\b/gi, 'estriming'],
  [/\bPodcast\b/gi, 'pódcast'],
]

export function applyPronunciationReplacements(text: string): string {
  let result = text
  for (const [pattern, replacement] of PRONUNCIATION_REPLACEMENTS) {
    result = result.replace(pattern, (match) =>
      replacement.length <= match.length ? replacement : match
    )
  }
  return result
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96) || 'default'
}

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

function rawCacheFile(
  input: ElevenLabsTtsInput,
  text: string,
  quality: ResolvedTtsQuality
): string {
  const key = hash(
    [
      input.model,
      input.voiceId,
      ttsQualityCacheToken(quality),
      RAW_FORMAT,
      input.language || 'es',
      input.pronunciationDictionaryId || '',
      input.pronunciationDictionaryVersionId || '',
      text,
    ].join('\n')
  )
  return path.join(
    CACHE_ROOT,
    'raw-v2',
    safeSegment(input.model),
    safeSegment(input.voiceId),
    `${key}.mp3`
  )
}

function legacyCacheFile(
  input: ElevenLabsTtsInput,
  text: string,
  legacyStyle: number
): string {
  const key = hash(
    `${input.model}\n${input.voiceId}\n${legacyStyle}\n${input.language || 'es'}\n${text}`
  )
  return path.join(
    CACHE_ROOT,
    safeSegment(input.model),
    safeSegment(input.voiceId),
    `${key}.mp3`
  )
}

function processedCacheFile(raw: Buffer): string {
  return path.join(
    CACHE_ROOT,
    'processed',
    VOICE_POST_PROCESS_VERSION,
    safeSegment(VOICE_POST_PROCESS_BITRATE),
    `${hash(raw)}.mp3`
  )
}

async function readCached(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') console.error('[elevenlabs-tts] cache read failed', err)
    return null
  }
}

async function writeCached(file: string, audio: Buffer): Promise<void> {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, audio)
  } catch (err) {
    console.error('[elevenlabs-tts] cache write failed', err)
  }
}

function voiceSettingsBody(quality: ResolvedTtsQuality, includeSpeed: boolean) {
  return {
    stability: quality.stability,
    similarity_boost: quality.similarityBoost,
    style: quality.style,
    use_speaker_boost: quality.useSpeakerBoost,
    ...(includeSpeed && quality.speed !== 1 ? { speed: quality.speed } : {}),
  }
}

async function requestAudio(
  input: ElevenLabsTtsInput,
  text: string,
  quality: ResolvedTtsQuality,
  format: string,
  includeSpeed: boolean,
  useDictionary: boolean
): Promise<Buffer> {
  const url = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}`
  )
  url.searchParams.set('output_format', format)

  const body: Record<string, unknown> = {
    text,
    model_id: input.model,
    ...(input.model !== 'eleven_multilingual_v2'
      ? { language_code: input.language || 'es' }
      : {}),
    apply_text_normalization: 'on',
    voice_settings: voiceSettingsBody(quality, includeSpeed),
  }

  if (useDictionary && input.pronunciationDictionaryId) {
    body.pronunciation_dictionary_locators = [
      {
        pronunciation_dictionary_id: input.pronunciationDictionaryId,
        ...(input.pronunciationDictionaryVersionId
          ? { version_id: input.pronunciationDictionaryVersionId }
          : {}),
      },
    ]
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': input.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    let message = `ElevenLabs respondió ${res.status}`
    try {
      const data = await res.json()
      message = data?.detail?.message || data?.detail || data?.message || message
    } catch {}
    const error = new Error(message) as Error & { status?: number }
    error.status = res.status
    throw error
  }

  return Buffer.from(await res.arrayBuffer())
}

async function generateRaw(
  input: ElevenLabsTtsInput,
  text: string,
  quality: ResolvedTtsQuality
): Promise<Buffer> {
  const dictionaryOptions = input.pronunciationDictionaryId ? [true, false] : [false]
  const attempts: Array<{ format: string; includeSpeed: boolean; useDictionary: boolean }> = []
  for (const format of [RAW_FORMAT, FALLBACK_FORMAT]) {
    for (const useDictionary of dictionaryOptions) {
      if (quality.speed !== 1) attempts.push({ format, includeSpeed: true, useDictionary })
      attempts.push({ format, includeSpeed: false, useDictionary })
    }
  }

  let lastError: unknown = null
  for (const attempt of attempts) {
    try {
      return await requestAudio(
        input,
        text,
        quality,
        attempt.format,
        attempt.includeSpeed,
        attempt.useDictionary
      )
    } catch (err) {
      lastError = err
      const status = (err as Error & { status?: number }).status
      if (status !== 400 && status !== 403 && status !== 422) throw err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('elevenlabs_generation_failed')
}

async function postProcessVoice(raw: Buffer): Promise<Buffer | null> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'tts-post-'))
  const inputPath = path.join(dir, 'raw.mp3')
  const outputPath = path.join(dir, 'processed.mp3')
  try {
    await fs.writeFile(inputPath, raw)
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i',
        inputPath,
        '-af',
        VOICE_POST_PROCESS_FILTER,
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        VOICE_POST_PROCESS_BITRATE,
        outputPath,
      ],
      { timeout: 60_000 }
    )
    return await fs.readFile(outputPath)
  } catch (err) {
    console.warn('[elevenlabs-tts] post-proceso falló; se usa el audio raw', err)
    return null
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

async function getRaw(
  input: ElevenLabsTtsInput,
  text: string,
  quality: ResolvedTtsQuality
): Promise<{ audio: Buffer; cached: boolean }> {
  const newFile = rawCacheFile(input, text, quality)
  if (input.cacheEnabled) {
    const cached = await readCached(newFile)
    if (cached) return { audio: cached, cached: true }

    const legacyStyle = input.legacyStyle ?? input.style ?? quality.style
    const legacyFile = legacyCacheFile(input, input.text.trim(), legacyStyle)
    const legacy = await readCached(legacyFile)
    if (legacy) {
      await writeCached(newFile, legacy)
      return { audio: legacy, cached: true }
    }
  }

  const audio = await generateRaw(input, text, quality)
  if (input.cacheEnabled) await writeCached(newFile, audio)
  return { audio, cached: false }
}

export async function synthesizeElevenLabs(
  input: ElevenLabsTtsInput
): Promise<ElevenLabsTtsResult> {
  const originalText = input.text.trim()
  if (!originalText) throw new Error('text_required')
  if (!input.apiKey) throw new Error('elevenlabs_api_key_required')
  if (!input.voiceId) throw new Error('elevenlabs_voice_id_required')

  const quality =
    input.quality ??
    ({
      ...resolveTtsQuality({ globalPreset: 'natural' }),
      style:
        typeof input.style === 'number' && input.style > 0
          ? Math.max(0, Math.min(1, input.style))
          : resolveTtsQuality({ globalPreset: 'natural' }).style,
    } satisfies ResolvedTtsQuality)

  const text = applyPronunciationReplacements(originalText)
  const key = `${rawCacheFile(input, text, quality)}:pp${input.postProcess === false ? '0' : VOICE_POST_PROCESS_VERSION}`

  const existing = inflight.get(key)
  if (existing) return existing

  const task = (async (): Promise<ElevenLabsTtsResult> => {
    const raw = await getRaw(input, text, quality)
    if (input.postProcess === false) {
      return { audio: raw.audio, contentType: 'audio/mpeg', cached: raw.cached }
    }

    const processedFile = processedCacheFile(raw.audio)
    if (input.cacheEnabled) {
      const processed = await readCached(processedFile)
      if (processed) {
        return { audio: processed, contentType: 'audio/mpeg', cached: true }
      }
    }

    const processed = await postProcessVoice(raw.audio)
    if (!processed) {
      return { audio: raw.audio, contentType: 'audio/mpeg', cached: raw.cached }
    }

    if (input.cacheEnabled) await writeCached(processedFile, processed)
    return { audio: processed, contentType: 'audio/mpeg', cached: raw.cached }
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}
