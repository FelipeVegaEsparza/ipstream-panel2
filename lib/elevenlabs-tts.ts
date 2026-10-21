// =====================================================
// ElevenLabs TTS + cache persistente de audios generados
// =====================================================
// El cache vive en el volumen app_uploads (public/uploads/tts-cache), así
// sobrevive a los deploys. La clave incluye modelo, voz y texto: una frase
// se genera una sola vez. Si el cache está desactivado, se llama siempre a
// la API.

import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

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
  language?: string
}

const CACHE_ROOT =
  process.env.TTS_CACHE_DIR?.trim() ||
  path.join(process.cwd(), 'public', 'uploads', 'tts-cache')

const inflight = new Map<string, Promise<ElevenLabsTtsResult>>()

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96) || 'default'
}

function cacheFile(input: ElevenLabsTtsInput): string {
  const hash = createHash('sha256')
    .update(`${input.model}\n${input.voiceId}\n${input.style ?? 0}\n${input.language || 'es'}\n${input.text}`)
    .digest('hex')
  return path.join(CACHE_ROOT, safeSegment(input.model), safeSegment(input.voiceId), `${hash}.mp3`)
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

async function generate(input: ElevenLabsTtsInput): Promise<Buffer> {
  const url = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voiceId)}`
  )
  url.searchParams.set('output_format', 'mp3_44100_128')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': input.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: input.text,
      model_id: input.model,
      // En los modelos que lo soportan, fuerza español y normalización de
      // números/fechas para evitar lecturas accidentales en inglés.
      ...(input.model !== 'eleven_multilingual_v2'
        ? { language_code: input.language || 'es' }
        : {}),
      apply_text_normalization: 'on',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: Math.max(0, Math.min(1, input.style ?? 0)),
        use_speaker_boost: true,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    let message = `ElevenLabs respondió ${res.status}`
    try {
      const data = await res.json()
      message = data?.detail?.message || data?.detail || data?.message || message
    } catch {}
    throw new Error(message)
  }

  return Buffer.from(await res.arrayBuffer())
}

export async function synthesizeElevenLabs(
  input: ElevenLabsTtsInput
): Promise<ElevenLabsTtsResult> {
  const text = input.text.trim()
  if (!text) throw new Error('text_required')
  if (!input.apiKey) throw new Error('elevenlabs_api_key_required')
  if (!input.voiceId) throw new Error('elevenlabs_voice_id_required')

  const file = cacheFile({ ...input, text })
  const key = file

  if (input.cacheEnabled) {
    const cached = await readCached(file)
    if (cached) return { audio: cached, contentType: 'audio/mpeg', cached: true }
  }

  const existing = inflight.get(key)
  if (existing) return existing

  const task = (async () => {
    const audio = await generate({ ...input, text })
    if (input.cacheEnabled) await writeCached(file, audio)
    return { audio, contentType: 'audio/mpeg', cached: false }
  })()

  inflight.set(key, task)
  try {
    return await task
  } finally {
    inflight.delete(key)
  }
}
