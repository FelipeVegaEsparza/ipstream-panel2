// =====================================================
// Jingle IA: música elegida por el cliente + locución + mezcla FFmpeg
// La IA se usa solo para la voz. La música la carga el admin.
// =====================================================

import { prisma } from '@/lib/prisma'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { mixMusicAndVoice } from '@/lib/audio-mix'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'

export const JINGLE_DURATIONS = [10, 15] as const

export interface GenerateJingleInput {
  clientId: string
  duration: number
  tagline: string
  music: Buffer
}

export interface GeneratedJingle {
  audio: Buffer
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
  if (!JINGLE_DURATIONS.includes(input.duration as 10 | 15)) {
    throw new Error('Duración inválida.')
  }
  if (!input.music.length) throw new Error('Elegí una pista de música para el jingle.')
  const station = await stationName(input.clientId)
  const tagline = input.tagline.replace(/\{\{\s*radio\s*\}\}/gi, station).trim()
  if (!tagline) throw new Error('Escribí la locución del jingle.')

  const voice = await synthesizePremiumTts({
    clientId: input.clientId,
    text: tagline.slice(0, 300),
    direction: FISH_AUDIO_DIRECTIONS.station,
  })

  const audio = await mixMusicAndVoice({
    music: input.music,
    voice: voice.audio,
    duration: input.duration,
    voiceDelaySeconds: 0.4,
    musicVolume: 0.35,
    loopMusic: true,
  })
  return {
    audio,
    ttsCached: voice.cached,
    ttsCharacters: tagline.slice(0, 300).length,
    stationName: station,
  }
}
