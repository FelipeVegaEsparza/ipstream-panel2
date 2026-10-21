// Fish Audio TTS + cache persistente de audios generados.

import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

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
  cacheEnabled: boolean
}

const CACHE_ROOT =
  process.env.TTS_CACHE_DIR?.trim() ||
  path.join(process.cwd(), 'public', 'uploads', 'tts-cache')

const inflight = new Map<string, Promise<FishAudioTtsResult>>()

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96) || 'default'
}

function cacheFile(input: FishAudioTtsInput): string {
  const hash = createHash('sha256')
    .update(`fish\n${input.model}\n${input.referenceId || ''}\n${input.text}`)
    .digest('hex')
  return path.join(
    CACHE_ROOT,
    'fish',
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
  const body: Record<string, unknown> = {
    text: input.text,
    format: 'mp3',
    mp3_bitrate: 128,
    normalize: true,
    chunk_length: 300,
    latency: 'normal',
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
  const text = input.text.trim()
  if (!text) throw new Error('text_required')
  if (!input.apiKey) throw new Error('fish_audio_api_key_required')

  const file = cacheFile({ ...input, text })
  if (input.cacheEnabled) {
    const cached = await readCached(file)
    if (cached) return { audio: cached, contentType: 'audio/mpeg', cached: true }
  }

  const existing = inflight.get(file)
  if (existing) return existing

  const task = (async () => {
    const audio = await generate({ ...input, text })
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
