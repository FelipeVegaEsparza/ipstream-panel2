// =====================================================
// Jingle IA: música con Eleven Music + locución + mezcla FFmpeg
// =====================================================

import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { synthesizePremiumTts } from '@/lib/premium-tts'

const execFileAsync = promisify(execFile)
export const JINGLE_DURATIONS = [10, 15] as const

export interface GenerateJingleInput {
  clientId: string
  prompt: string
  duration: number
  tagline: string
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

async function generateMusic(prompt: string, duration: number, apiKey: string): Promise<Buffer> {
  const url = new URL('https://api.elevenlabs.io/v1/music')
  url.searchParams.set('output_format', 'mp3_44100_128')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: duration * 1000,
      model_id: 'music_v2_5',
      force_instrumental: true,
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    let message = `No se pudo generar la música (${res.status}).`
    try {
      const data = await res.json()
      message =
        data?.detail?.message ||
        data?.detail?.data?.prompt_suggestion ||
        data?.detail ||
        message
    } catch {}
    throw new Error(message)
  }
  return Buffer.from(await res.arrayBuffer())
}

async function mixMusicAndVoice(
  music: Buffer,
  voice: Buffer,
  duration: number
): Promise<Buffer> {
  const dir = await fs.mkdtemp(join(tmpdir(), 'jingle-ai-'))
  const musicPath = join(dir, 'music.mp3')
  const voicePath = join(dir, 'voice.mp3')
  const outPath = join(dir, 'jingle.mp3')
  try {
    await fs.writeFile(musicPath, music)
    await fs.writeFile(voicePath, voice)
    const fadeOut = Math.max(0.2, duration - 0.6)
    const filter = [
      `[0:a]volume=0.35,afade=t=in:st=0:d=0.3,afade=t=out:st=${fadeOut}:d=0.6[bed]`,
      `[1:a]adelay=400|400,volume=1.0[tag]`,
      `[bed][tag]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,alimiter=limit=0.95[out]`,
    ].join(';')
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', musicPath,
      '-i', voicePath,
      '-filter_complex', filter,
      '-map', '[out]',
      '-t', String(duration),
      '-ar', '44100',
      '-ac', '2',
      '-b:a', '192k',
      outPath,
    ], { timeout: 60_000 })
    return await fs.readFile(outPath)
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function generateJingle(input: GenerateJingleInput): Promise<GeneratedJingle> {
  const config = await getElevenLabsConfig()
  if (!config.apiKey) throw new Error('La música IA de ElevenLabs no está configurada.' )
  if (!JINGLE_DURATIONS.includes(input.duration as 10 | 15)) {
    throw new Error('Duración inválida.')
  }
  const station = await stationName(input.clientId)
  const tagline = input.tagline.replace(/\{\{\s*radio\s*\}\}/gi, station).trim()
  if (!tagline) throw new Error('Escribí la locución del jingle.')

  const [music, voice] = await Promise.all([
    generateMusic(input.prompt, input.duration, config.apiKey),
    synthesizePremiumTts({ clientId: input.clientId, text: tagline.slice(0, 300) }),
  ])

  const audio = await mixMusicAndVoice(music, voice.audio, input.duration)
  return {
    audio,
    ttsCached: voice.cached,
    ttsCharacters: tagline.slice(0, 300).length,
    stationName: station,
  }
}
