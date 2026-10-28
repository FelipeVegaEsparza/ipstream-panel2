// Fish Audio config — proveedor alternativo de texto a voz.
// La API key se guarda encriptada en app_config; el env queda como fallback.

import { prisma } from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'
import { DEFAULT_FISH_AUDIO_MODEL, validFishAudioModel } from '@/lib/fish-audio-models'

export interface FishAudioConfig {
  apiKey: string
  model: string
  referenceId: string
  direction: string
  enabled: boolean
  cacheEnabled: boolean
}

const CACHE_TTL_MS = 60_000
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

function envConfig(): FishAudioConfig {
  const apiKey = clean(process.env.FISH_AUDIO_API_KEY)
  return {
    apiKey,
    model: validFishAudioModel(process.env.FISH_AUDIO_MODEL),
    referenceId: clean(process.env.FISH_AUDIO_REFERENCE_ID),
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
        fishAudioDirection: true,
        ttsCacheEnabled: true,
      },
    })
    if (cfg) {
      value = {
        apiKey: secretFromDb(cfg.fishAudioApiKeyEnc) || env.apiKey,
        model: validFishAudioModel(cfg.fishAudioModel || env.model || DEFAULT_FISH_AUDIO_MODEL),
        referenceId: clean(cfg.fishAudioReferenceId) || env.referenceId,
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
