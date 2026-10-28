// Selecciona ElevenLabs o Fish Audio según la configuración del admin.
// Si el proveedor elegido no está configurado o falla, intenta el otro y
// deja que el endpoint decida el fallback final a Piper.

import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { getFishAudioConfig } from '@/lib/fish-audio-config'
import { synthesizeElevenLabs } from '@/lib/elevenlabs-tts'
import { synthesizeFishAudio } from '@/lib/fish-audio-tts'
import { getClientVoiceSettings } from '@/lib/elevenlabs-voices'
import { getTtsProvider, type TtsProvider } from '@/lib/tts-provider'

export interface PremiumTtsResult {
  audio: Buffer
  contentType: string
  provider: TtsProvider
  cached: boolean
}

export async function hasConfiguredPremiumTts(): Promise<boolean> {
  const [eleven, fish] = await Promise.all([
    getElevenLabsConfig(),
    getFishAudioConfig(),
  ])
  return Boolean(
    (eleven.enabled && eleven.apiKey && eleven.voiceId) ||
    (fish.enabled && fish.apiKey)
  )
}

export async function synthesizePremiumTts(input: {
  clientId: string
  text: string
  direction?: string
}): Promise<PremiumTtsResult> {
  const selected = await getTtsProvider()
  const order: TtsProvider[] = selected === 'fish'
    ? ['fish', 'elevenlabs']
    : ['elevenlabs', 'fish']
  let lastError: unknown = null

  for (const provider of order) {
    try {
      if (provider === 'fish') {
        const config = await getFishAudioConfig()
        if (!config.enabled || !config.apiKey) continue
        const result = await synthesizeFishAudio({
          text: input.text,
          apiKey: config.apiKey,
          model: config.model,
          referenceId: config.referenceId,
          direction: config.direction || input.direction,
          cacheEnabled: config.cacheEnabled,
        })
        return { ...result, provider: 'fish' }
      }

      const config = await getElevenLabsConfig()
      if (!config.enabled || !config.apiKey || !config.voiceId) continue
      const voice = await getClientVoiceSettings(input.clientId)
      const result = await synthesizeElevenLabs({
        text: input.text,
        apiKey: config.apiKey,
        voiceId: voice.voiceId || config.voiceId,
        model: config.model,
        cacheEnabled: config.cacheEnabled,
        style: voice.style / 100,
        legacyStyle: voice.style / 100,
        quality: voice.quality,
        pronunciationDictionaryId: config.pronunciationDictionaryId,
        pronunciationDictionaryVersionId: config.pronunciationDictionaryVersionId,
      })
      return { ...result, provider: 'elevenlabs' }
    } catch (err) {
      lastError = err
      console.warn(`[premium-tts] ${provider} falló:`, err instanceof Error ? err.message : err)
    }
  }

  if (lastError instanceof Error) throw lastError
  throw new Error('tts_not_configured')
}
