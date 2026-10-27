// =====================================================
// ElevenLabs config — credenciales de locución premium
// =====================================================
// Se configuran en /admin/settings → Locución. La API key se guarda
// encriptada en app_config; si no hay valor en DB se usa el env como fallback.

import { prisma } from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'

import {
  ELEVENLABS_MODELS,
  DEFAULT_ELEVENLABS_MODEL,
} from '@/lib/elevenlabs-models'
import {
  DEFAULT_TTS_QUALITY_PRESET,
  isTtsQualityPresetId,
} from '@/lib/tts-quality'



export interface ElevenLabsConfig {
  apiKey: string
  voiceId: string
  model: string
  enabled: boolean
  cacheEnabled: boolean
  qualityPreset: string
  pronunciationDictionaryId: string | null
  pronunciationDictionaryVersionId: string | null
}

const CACHE_TTL_MS = 60_000
let cache: { value: ElevenLabsConfig; at: number } | null = null

function clean(value: string | null | undefined): string {
  return (value || '').trim()
}

function validModel(value: string | null | undefined): string {
  const model = clean(value)
  return ELEVENLABS_MODELS.some((entry) => entry.id === model) ? model : DEFAULT_ELEVENLABS_MODEL
}

function envConfig(): ElevenLabsConfig {
  const apiKey = clean(process.env.ELEVENLABS_API_KEY)
  const voiceId = clean(process.env.ELEVENLABS_VOICE_ID)
  return {
    apiKey,
    voiceId,
    model: validModel(process.env.ELEVENLABS_MODEL),
    enabled: Boolean(apiKey && voiceId) && process.env.ELEVENLABS_ENABLED !== 'false',
    cacheEnabled: process.env.TTS_CACHE_ENABLED !== 'false',
    qualityPreset: isTtsQualityPresetId(process.env.TTS_QUALITY_PRESET)
      ? process.env.TTS_QUALITY_PRESET
      : DEFAULT_TTS_QUALITY_PRESET,
    pronunciationDictionaryId: clean(process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_ID) || null,
    pronunciationDictionaryVersionId: clean(process.env.ELEVENLABS_PRONUNCIATION_DICTIONARY_VERSION_ID) || null,
  }
}

function secretFromDb(enc: string | null): string | null {
  if (!enc) return null
  try {
    return isEncrypted(enc) ? decrypt(enc) : enc
  } catch {
    return null
  }
}

export function invalidateElevenLabsConfig(): void {
  cache = null
}

export async function getElevenLabsConfig(): Promise<ElevenLabsConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value

  const env = envConfig()
  let value = env
  try {
    const cfg = await prisma.appConfig.findFirst({
      select: {
        elevenLabsApiKeyEnc: true,
        elevenLabsVoiceId: true,
        elevenLabsModel: true,
        elevenLabsEnabled: true,
        ttsCacheEnabled: true,
        ttsQualityPreset: true,
        pronunciationDictionaryId: true,
        pronunciationDictionaryVersionId: true,
      },
    })
    if (cfg) {
      value = {
        apiKey: secretFromDb(cfg.elevenLabsApiKeyEnc) || env.apiKey,
        voiceId: clean(cfg.elevenLabsVoiceId) || env.voiceId,
        model: validModel(cfg.elevenLabsModel || env.model),
        enabled: cfg.elevenLabsEnabled,
        cacheEnabled: cfg.ttsCacheEnabled,
        qualityPreset: isTtsQualityPresetId(cfg.ttsQualityPreset)
          ? cfg.ttsQualityPreset
          : env.qualityPreset,
        pronunciationDictionaryId:
          clean(cfg.pronunciationDictionaryId) || env.pronunciationDictionaryId,
        pronunciationDictionaryVersionId:
          clean(cfg.pronunciationDictionaryVersionId) ||
          env.pronunciationDictionaryVersionId,
      }
    }
  } catch {
    // DB no disponible: usar env
  }

  cache = { value, at: Date.now() }
  return value
}
