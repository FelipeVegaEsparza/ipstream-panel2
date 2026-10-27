import { promises as fs } from 'fs'
import path from 'path'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { getAiMusicAccess, consumeAiMusicSeconds } from '@/lib/ai-music'
import { mixMusicAndVoice, probeAudioBufferDuration } from '@/lib/audio-mix'
const INTRO_SECONDS = 4
const MUSIC_BED_SECONDS = 10
const INTRO_GAIN = 0.55
const BED_GAIN = 0.18

async function generateMusicBed(): Promise<Buffer | null> {
  const config = await getElevenLabsConfig()
  if (!config.apiKey) return null
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt: 'Música instrumental suave para cápsula informativa de radio: intro cálida, moderna, sin voces, loopable, con final limpio.',
        music_length_ms: MUSIC_BED_SECONDS * 1000,
        model_id: 'music_v2_5',
        force_instrumental: true,
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function defaultBed(): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(process.cwd(), 'public', 'audio', 'default-jingle.mp3'))
  } catch {
    return null
  }
}

/**
 * Devuelve la voz con una intro musical y una cama baja durante la locución.
 * Si el plan no tiene minutos de música o falla Eleven Music, usa el jingle
 * base como respaldo. Nunca deja la cápsula sin audio.
 */
export async function addCapsuleIntro(clientId: string, voice: Buffer): Promise<Buffer> {
  const access = await getAiMusicAccess(clientId)
  let bed: Buffer | null = null
  if (access.enabled && access.remainingSeconds >= MUSIC_BED_SECONDS) {
    bed = await generateMusicBed()
    if (bed) {
      await consumeAiMusicSeconds(clientId, MUSIC_BED_SECONDS, 'ai-capsule').catch(() => {})
    }
  }
  if (!bed) bed = await defaultBed()
  if (!bed) return voice
  try {
    const voiceDuration = (await probeAudioBufferDuration(voice)) || 30
    const total = Math.ceil((INTRO_SECONDS + voiceDuration + 1.2) * 10) / 10
    return await mixMusicAndVoice({
      music: bed,
      voice,
      duration: total,
      voiceDelaySeconds: INTRO_SECONDS,
      musicVolume: BED_GAIN,
      introSeconds: INTRO_SECONDS,
      introVolume: INTRO_GAIN,
      bedVolume: BED_GAIN,
      loopMusic: true,
    })
  } catch {
    return voice
  }
}
