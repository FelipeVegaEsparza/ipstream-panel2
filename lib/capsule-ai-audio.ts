import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { getAiMusicAccess, consumeAiMusicSeconds } from '@/lib/ai-music'

const execFileAsync = promisify(execFile)
const INTRO_SECONDS = 4
const MUSIC_BED_SECONDS = 10
const INTRO_GAIN = 0.55
const BED_GAIN = 0.18

async function probeDuration(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
    ], { timeout: 15_000 })
    const seconds = Number(String(stdout).trim())
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null
  } catch {
    return null
  }
}

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

async function mixIntroBedAndVoice(bed: Buffer, voice: Buffer): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'capsule-ai-'))
  const bedPath = path.join(dir, 'bed.mp3')
  const voicePath = path.join(dir, 'voice.mp3')
  const outputPath = path.join(dir, `${randomUUID()}.mp3`)
  try {
    await fs.writeFile(bedPath, bed)
    await fs.writeFile(voicePath, voice)
    const voiceDuration = (await probeDuration(voicePath)) || 30
    const total = Math.ceil((INTRO_SECONDS + voiceDuration + 1.2) * 10) / 10
    const fadeStart = Math.max(INTRO_SECONDS, total - 0.9)
    const filter = [
      // La música entra desde el inicio. A los 4 s baja de volumen y sigue
      // como fondo mientras habla la locución. Se repite si es más corta.
      `[0:a]atrim=0:${total},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.25,afade=t=out:st=${fadeStart}:d=0.9,volume=${INTRO_GAIN}:enable='lt(t,${INTRO_SECONDS})',volume=${BED_GAIN}:enable='gte(t,${INTRO_SECONDS})'[music]`,
      `[1:a]adelay=${INTRO_SECONDS * 1000}|${INTRO_SECONDS * 1000}[voice]`,
      `[music][voice]amix=inputs=2:duration=longest:dropout_transition=0,alimiter=limit=0.95[out]`,
    ].join(';')
    await execFileAsync('ffmpeg', [
      '-y',
      '-stream_loop', '-1',
      '-i', bedPath,
      '-i', voicePath,
      '-filter_complex', filter,
      '-map', '[out]',
      '-t', String(total),
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '192k',
      outputPath,
    ], { timeout: 90_000 })
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
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
      await consumeAiMusicSeconds(clientId, MUSIC_BED_SECONDS).catch(() => {})
    }
  }
  if (!bed) bed = await defaultBed()
  if (!bed) return voice
  try {
    return await mixIntroBedAndVoice(bed, voice)
  } catch {
    return voice
  }
}
