// =====================================================
// Generación y subida del audio de un especial
// =====================================================

import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { synthesizeSpecialSpeech, type SpecialPart } from '@/lib/specials'

export interface SpecialAudioSuccess {
  ok: true
  part: SpecialPart
  text: string
  seconds: number | null
  cached: boolean
  trimmed: boolean
}

export interface SpecialAudioFailure {
  ok: false
  status: number
  error: string
  message: string
}

export type SpecialAudioResult = SpecialAudioSuccess | SpecialAudioFailure

export async function generateAndUploadSpecialAudio(input: {
  clientId: string
  specialId: string
  part: SpecialPart
  text: string
}): Promise<SpecialAudioResult> {
  const access = await getAiLiveAccess(input.clientId)
  if (!access.enabled) {
    return { ok: false, status: 403, error: 'ai_not_included', message: 'Tu plan no incluye IA.' }
  }
  if (!(await hasConfiguredPremiumTts())) {
    return {
      ok: false,
      status: 503,
      error: 'tts_not_configured',
      message: 'Configurá ElevenLabs o Fish Audio en Locución.',
    }
  }

  const text = (input.text || '').replace(/\s+/g, ' ').trim()
  if (!text) {
    return { ok: false, status: 400, error: 'missing_text', message: 'Falta el texto de esta parte.' }
  }

  const speech = await synthesizeSpecialSpeech({
    clientId: input.clientId,
    text,
    part: input.part,
  })
  if (!speech) {
    return {
      ok: false,
      status: 422,
      error: 'audio_too_long',
      message: 'El audio supera los 20 segundos. Acortá el texto e intentá de nuevo.',
    }
  }

  if (!speech.cached) {
    if (speech.text.length > access.remaining) {
      return {
        ok: false,
        status: 402,
        error: 'ai_quota_exceeded',
        message: `El audio necesita ${speech.text.length} caracteres y te quedan ${access.remaining}.`,
      }
    }
    try {
      await consumeAiCharacters(input.clientId, speech.text.length, 'ai-special')
    } catch (err) {
      console.error('[specials audio] no se pudo registrar la cuota:', err)
    }
  }

  const file = new File(
    [new Uint8Array(speech.audio)],
    `${input.part}.mp3`,
    { type: speech.contentType || 'audio/mpeg' }
  )
  try {
    await streamingClient.uploadSpecialAudio(input.clientId, input.specialId, input.part, file)
  } catch (err) {
    if (err instanceof StreamingAgentError) {
      return { ok: false, status: 502, error: 'agent_error', message: err.message }
    }
    return {
      ok: false,
      status: 500,
      error: 'upload_failed',
      message: err instanceof Error ? err.message : 'No se pudo subir el audio al agente.',
    }
  }

  await prisma.radioSpecial.update({
    where: { id: input.specialId },
    data: input.part === 'intro'
      ? { introText: speech.text, introReadyAt: new Date() }
      : { closingText: speech.text, closingReadyAt: new Date() },
  })

  return {
    ok: true,
    part: input.part,
    text: speech.text,
    seconds: speech.seconds,
    cached: speech.cached,
    trimmed: speech.text !== text,
  }
}
