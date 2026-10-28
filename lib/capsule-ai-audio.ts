import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { mixMusicAndVoice, probeAudioBufferDuration } from '@/lib/audio-mix'

const INTRO_SECONDS = 4
const INTRO_GAIN = 0.55
const BED_GAIN = 0.18

async function selectedMusicBed(clientId: string): Promise<Buffer | null> {
  try {
    const stream = await prisma.radioStream.findUnique({
      where: { clientId },
      select: {
        jingleMusicTrack: { select: { url: true, active: true } },
      },
    })
    const track = stream?.jingleMusicTrack
    if (!track?.active) return null
    const storedName = path.basename(track.url)
    return await fs.readFile(path.join(process.cwd(), 'public', 'uploads', 'music', storedName))
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
 * Usa la pista elegida por el cliente; si no hay, cae al jingle base.
 * La IA solo genera la voz.
 */
export async function addCapsuleIntro(clientId: string, voice: Buffer): Promise<Buffer> {
  let bed = await selectedMusicBed(clientId)
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
