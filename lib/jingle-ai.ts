// =====================================================
// Jingle IA: música elegida por el cliente + locución + mezcla FFmpeg
// La IA se usa solo para la voz. La música la carga el admin.
// =====================================================

import { prisma } from '@/lib/prisma'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import {
  mixJingle,
  resolveJingleDirection,
  resolveJingleFx,
  type JingleOverrides,
  type JingleStyleId,
} from '@/lib/jingle-fx'
import { composeJingleVoice, type VoiceChunk } from '@/lib/jingle-voice'
import { splitJingleScript } from '@/lib/jingle-script'
import { analyzeMusicBeats } from '@/lib/jingle-beats'
import { probeAudioBufferDuration } from '@/lib/audio-mix'

export const JINGLE_DURATIONS = [10, 15, 30] as const
export type JingleDuration = (typeof JINGLE_DURATIONS)[number]

export interface GenerateJingleInput {
  clientId: string
  duration: number
  tagline: string
  music: Buffer
  style?: string
  intensity?: number
  voiceFx?: boolean
  overrides?: JingleOverrides
}

export interface GeneratedJingle {
  audio: Buffer
  duration: number
  style: JingleStyleId
  ttsCached: boolean
  ttsCharacters: number
  stationName: string
}

async function stationName(clientId: string): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true, basicData: { select: { projectName: true } } },
  })
  return client?.basicData?.projectName || client?.name || 'la radio'
}

export async function generateJingle(input: GenerateJingleInput): Promise<GeneratedJingle> {
  if (!JINGLE_DURATIONS.includes(input.duration as JingleDuration)) {
    throw new Error('Duración inválida.')
  }
  if (!input.music.length) throw new Error('Elegí una pista de música para el jingle.')
  const station = await stationName(input.clientId)
  const tagline = input.tagline.replace(/\{\{\s*radio\s*\}\}/gi, station).trim()
  if (!tagline) throw new Error('Escribí la locución del jingle.')

  const text = tagline.slice(0, 300)
  const fx = resolveJingleFx(
    input.style,
    input.intensity,
    input.voiceFx !== false,
    input.overrides
  )
  const direction = resolveJingleDirection(fx.style)
  // La edición por frases es opt-in: elegir una transición explícita la activa.
  // Por defecto se pide una sola locución para conservar la prosodia natural del TTS.
  const explicitTransition = input.overrides?.transitionSfx
  const phraseEditing = Boolean(
    explicitTransition &&
      explicitTransition !== 'auto' &&
      explicitTransition !== 'none'
  )
  const phrases =
    fx.style === 'classic' || !phraseEditing ? [text] : splitJingleScript(text)

  const chunks: VoiceChunk[] = []
  let ttsCached = true
  let ttsCharacters = 0
  for (const phrase of phrases) {
    const voice = await synthesizePremiumTts({
      clientId: input.clientId,
      text: phrase,
      direction,
    })
    const probed = await probeAudioBufferDuration(voice.audio)
    const estimated = Math.max(1, phrase.split(/\s+/).length * 0.34)
    chunks.push({ audio: voice.audio, duration: probed ?? estimated })
    ttsCached = ttsCached && voice.cached
    ttsCharacters += phrase.length
  }

  const composed =
    chunks.length > 1
      ? await composeJingleVoice({
          chunks,
          style: fx.style,
          transitionSfx: fx.transitionSfx,
          retuneFirst: fx.voiceFx,
        })
      : { audio: chunks[0].audio, duration: chunks[0].duration }

  // La música arranca en un golpe; la voz se centra entre intro y cierre.
  const beats = await analyzeMusicBeats(input.music)

  const mixed = await mixJingle({
    music: input.music,
    voice: composed.audio,
    requestedDuration: input.duration,
    style: fx.style,
    intensity: fx.intensity,
    voiceFx: fx.voiceFx,
    overrides: input.overrides,
    musicStartSeconds: beats?.startSeconds ?? 0,
  })
  return {
    audio: mixed.audio,
    duration: mixed.duration,
    style: mixed.style,
    ttsCached,
    ttsCharacters,
    stationName: station,
  }
}
