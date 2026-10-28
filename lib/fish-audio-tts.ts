// Fish Audio TTS + cache persistente de audios generados.
// Drama 3 acepta una dirección de locución en español y usa un post-proceso
// de voz equivalente al de ElevenLabs para mantener el mismo nivel de salida.

import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import {
  postProcessVoice,
  VOICE_POST_PROCESS_VERSION,
} from '@/lib/elevenlabs-tts'

export interface FishAudioTtsResult {
  audio: Buffer
  contentType: string
  cached: boolean
}

export interface FishAudioTtsInput {
  text: string
  apiKey: string
  model: string
  referenceId?: string
  direction?: string
  cacheEnabled: boolean
  language?: string
  postProcess?: boolean
}

const CACHE_VERSION = 'v2'
const MAX_DIRECTION_CHARS = 500

const CACHE_ROOT =
  process.env.TTS_CACHE_DIR?.trim() ||
  path.join(process.cwd(), 'public', 'uploads', 'tts-cache')

const inflight = new Map<string, Promise<FishAudioTtsResult>>()

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96) || 'default'
}

function addDramaPause(text: string): string {
  if (/\[(?:pausa|break|long-break)/i.test(text)) return text
  const match = text.match(/^(.+?[.!?])\s+([\s\S]+)$/)
  if (!match) return text
  const [, first, rest] = match
  return rest.trim() ? `${first} [pausa breve] ${rest}` : text
}

function fullText(input: FishAudioTtsInput): string {
  const text = input.text.trim()
  const direction = (input.direction || '').trim().slice(0, MAX_DIRECTION_CHARS)
  if (input.model !== 'drama-3' || !direction) return text
  return `${direction} ${addDramaPause(text)}`
}

function cacheFile(input: FishAudioTtsInput, text: string): string {
  const hash = createHash('sha256')
    .update(
      [
        'fish',
        CACHE_VERSION,
        input.model,
        input.referenceId || '',
        input.language || 'es-CL',
        input.postProcess === false ? 'raw' : `pp:${VOICE_POST_PROCESS_VERSION}`,
        text,
      ].join('\n')
    )
    .digest('hex')
  return path.join(
    CACHE_ROOT,
    'fish',
    CACHE_VERSION,
    safeSegment(input.model),
    safeSegment(input.referenceId || 'default'),
    `${hash}.mp3`
  )
}

async function readCached(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') console.error('[fish-audio-tts] cache read failed', err)
    return null
  }
}

async function writeCached(file: string, audio: Buffer): Promise<void> {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, audio)
  } catch (err) {
    console.error('[fish-audio-tts] cache write failed', err)
  }
}

async function generate(input: FishAudioTtsInput): Promise<Buffer> {
  const isDrama3 = input.model === 'drama-3'
  const body: Record<string, unknown> = {
    text: input.text,
    format: 'mp3',
    mp3_bitrate: 192,
    sample_rate: 44100,
    normalize: true,
    language: input.language || 'es-CL',
    chunk_length: 300,
    min_chunk_length: 50,
    latency: 'normal',
    max_new_tokens: 1024,
    repetition_penalty: isDrama3 ? 1.15 : 1.2,
    condition_on_previous_chunks: true,
    early_stop_threshold: 1,
    temperature: isDrama3 ? 0.85 : 0.7,
    top_p: isDrama3 ? 0.85 : 0.7,
    prosody: { speed: 1, volume: 0, normalize_loudness: true },
  }
  if (input.referenceId) body.reference_id = input.referenceId

  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
      model: input.model,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    let message = `Fish Audio respondió ${res.status}`
    try {
      const data = await res.json()
      message = data?.message || data?.reason || message
    } catch {}
    throw new Error(message)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function synthesizeFishAudio(
  input: FishAudioTtsInput
): Promise<FishAudioTtsResult> {
  const text = fullText(input)
  if (!text) throw new Error('text_required')
  if (!input.apiKey) throw new Error('fish_audio_api_key_required')

  const file = cacheFile(input, text)
  if (input.cacheEnabled) {
    const cached = await readCached(file)
    if (cached) return { audio: cached, contentType: 'audio/mpeg', cached: true }
  }

  const existing = inflight.get(file)
  if (existing) return existing

  const task = (async () => {
    const raw = await generate({ ...input, text })
    let audio = raw
    if (input.postProcess !== false) {
      const processed = await postProcessVoice(raw, 'fish-audio-tts')
      if (processed) audio = processed
    }
    if (input.cacheEnabled) await writeCached(file, audio)
    return { audio, contentType: 'audio/mpeg', cached: false }
  })()

  inflight.set(file, task)
  try {
    return await task
  } finally {
    inflight.delete(file)
  }
}
