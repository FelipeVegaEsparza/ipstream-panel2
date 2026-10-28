// Fish Audio config — proveedor alternativo de texto a voz.
// La API key se guarda encriptada en app_config; el env queda como fallback.

import { prisma } from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'
import { DEFAULT_FISH_AUDIO_MODEL, validFishAudioModel } from '@/lib/fish-audio-models'

export type FishVoiceGender = 'male' | 'female'

export interface FishVoiceOption {
  id: string
  name: string
  gender: FishVoiceGender
  referenceId: string
}

export interface FishAudioConfig {
  apiKey: string
  model: string
  referenceId: string
  voices: FishVoiceOption[]
  direction: string
  enabled: boolean
  cacheEnabled: boolean
}

const CACHE_TTL_MS = 60_000
const MAX_VOICES = 6
const MAX_PER_GENDER = 3
let cache: { value: FishAudioConfig; at: number } | null = null

function clean(value: string | null | undefined): string {
  return (value || '').trim()
}

function secretFromDb(enc: string | null): string | null {
  if (!enc) return null
  try {
    return isEncrypted(enc) ? decrypt(enc) : enc
  } catch {
    return null
  }
}

export function parseFishVoiceCatalog(raw: string | null | undefined): FishVoiceOption[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const counts: Record<FishVoiceGender, number> = { male: 0, female: 0 }
    const seen = new Set<string>()
    const voices: FishVoiceOption[] = []
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue
      const gender: FishVoiceGender | null =
        entry.gender === 'female' ? 'female' : entry.gender === 'male' ? 'male' : null
      if (!gender || counts[gender] >= MAX_PER_GENDER) continue
      const name = typeof entry.name === 'string' ? entry.name.trim().slice(0, 120) : ''
      const referenceId =
        typeof entry.referenceId === 'string' ? entry.referenceId.trim().slice(0, 191) : ''
      if (!name || !referenceId) continue
      const requestedId =
        typeof entry.id === 'string' ? entry.id.trim().slice(0, 64) : ''
      let id = requestedId && !seen.has(requestedId)
        ? requestedId
        : `fish-${gender}-${counts[gender] + 1}`
      while (seen.has(id)) id = `${id}-x`
      seen.add(id)
      counts[gender]++
      voices.push({ id, name, gender, referenceId })
      if (voices.length >= MAX_VOICES) break
    }
    return voices
  } catch {
    return []
  }
}

function envConfig(): FishAudioConfig {
  const apiKey = clean(process.env.FISH_AUDIO_API_KEY)
  const voices = parseFishVoiceCatalog(process.env.FISH_AUDIO_VOICES)
  return {
    apiKey,
    model: validFishAudioModel(process.env.FISH_AUDIO_MODEL),
    referenceId: clean(process.env.FISH_AUDIO_REFERENCE_ID) || voices[0]?.referenceId || '',
    voices,
    direction: clean(process.env.FISH_AUDIO_DIRECTION),
    enabled: Boolean(apiKey) && process.env.FISH_AUDIO_ENABLED !== 'false',
    cacheEnabled: process.env.TTS_CACHE_ENABLED !== 'false',
  }
}

export function invalidateFishAudioConfig(): void {
  cache = null
}

export async function getFishAudioConfig(): Promise<FishAudioConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value
  const env = envConfig()
  let value = env
  try {
    const cfg = await prisma.appConfig.findFirst({
      select: {
        fishAudioApiKeyEnc: true,
        fishAudioModel: true,
        fishAudioReferenceId: true,
        fishAudioVoices: true,
        fishAudioDirection: true,
        ttsCacheEnabled: true,
      },
    })
    if (cfg) {
      const dbVoices = parseFishVoiceCatalog(cfg.fishAudioVoices)
      const voices = dbVoices.length ? dbVoices : env.voices
      value = {
        apiKey: secretFromDb(cfg.fishAudioApiKeyEnc) || env.apiKey,
        model: validFishAudioModel(cfg.fishAudioModel || env.model || DEFAULT_FISH_AUDIO_MODEL),
        referenceId: clean(cfg.fishAudioReferenceId) || voices[0]?.referenceId || env.referenceId,
        voices,
        direction: clean(cfg.fishAudioDirection) || env.direction,
        enabled: Boolean(secretFromDb(cfg.fishAudioApiKeyEnc) || env.apiKey) &&
          process.env.FISH_AUDIO_ENABLED !== 'false',
        cacheEnabled: cfg.ttsCacheEnabled,
      }
    }
  } catch {
    // DB no disponible: usar env
  }
  cache = { value, at: Date.now() }
  return value
}

export async function getClientFishVoice(clientId: string): Promise<FishVoiceOption | null> {
  const [config, stream] = await Promise.all([
    getFishAudioConfig(),
    prisma.radioStream
      .findUnique({ where: { clientId }, select: { fishVoiceId: true } })
      .catch(() => null),
  ])
  return config.voices.find((voice) => voice.id === stream?.fishVoiceId) || null
}

export async function getClientFishVoiceReference(clientId: string): Promise<string> {
  const [config, voice] = await Promise.all([
    getFishAudioConfig(),
    getClientFishVoice(clientId),
  ])
  return voice?.referenceId || config.referenceId
}
