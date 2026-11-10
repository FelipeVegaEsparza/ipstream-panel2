import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { mixMusicAndVoice, probeAudioBufferDuration } from '@/lib/audio-mix'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'
import type { NewsScript } from './script'

const execFileAsync = promisify(execFile)
export const MAX_NEWS_CAPSULE_SECONDS = 120

async function concatSegments(segments: Buffer[]): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'news-capsule-'))
  const out = path.join(dir, 'capsule.mp3')
  try {
    const inputs: string[] = []
    for (let index = 0; index < segments.length; index += 1) {
      const file = path.join(dir, `part-${index}.mp3`)
      await fs.writeFile(file, segments[index])
      inputs.push(file)
    }
    const filters = segments
      .map((_, index) => `[${index}:a]aformat=channel_layouts=stereo,aresample=44100,apad=pad_dur=0.22[p${index}]`)
      .join(';')
    const labels = segments.map((_, index) => `[p${index}]`).join('')
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        ...inputs.flatMap((file) => ['-i', file]),
        '-filter_complex',
        `${filters};${labels}concat=n=${segments.length}:v=0:a=1[out]`,
        '-map',
        '[out]',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        '192k',
        out,
      ],
      { timeout: 90_000 }
    )
    return await fs.readFile(out)
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export interface GeneratedNewsAudio {
  audio: Buffer
  duration: number
  ttsCharacters: number
  ttsCached: boolean
}

interface AudioDeps {
  synthesize?: typeof synthesizePremiumTts
  mix?: typeof mixMusicAndVoice
  probe?: typeof probeAudioBufferDuration
  concat?: (segments: Buffer[]) => Promise<Buffer>
}

export async function generateNewsCapsuleAudio(input: {
  clientId: string
  script: NewsScript
  music: Buffer | null
}, deps: AudioDeps = {}): Promise<GeneratedNewsAudio> {
  const synthesize = deps.synthesize ?? synthesizePremiumTts
  const mix = deps.mix ?? mixMusicAndVoice
  const probe = deps.probe ?? probeAudioBufferDuration
  const concat = deps.concat ?? concatSegments
  const parts = [
    { text: input.script.intro, direction: FISH_AUDIO_DIRECTIONS.capsule },
    { text: input.script.body, direction: FISH_AUDIO_DIRECTIONS.capsule },
    { text: input.script.closing, direction: FISH_AUDIO_DIRECTIONS.station },
  ]
  const segments: Buffer[] = []
  let ttsCharacters = 0
  let ttsCached = true
  for (const part of parts) {
    if (!part.text.trim()) continue
    const result = await synthesize({
      clientId: input.clientId,
      text: part.text,
      direction: part.direction,
    })
    segments.push(result.audio)
    ttsCharacters += part.text.length
    ttsCached = ttsCached && result.cached
  }
  if (segments.length === 0) throw new Error('La cápsula no tiene locución.')

  const voice = segments.length === 1 ? segments[0] : await concat(segments)
  const voiceDuration = (await probe(voice)) || 0
  if (voiceDuration > MAX_NEWS_CAPSULE_SECONDS) {
    throw new Error(`La cápsula supera el máximo de ${MAX_NEWS_CAPSULE_SECONDS} segundos.`)
  }

  let audio = voice
  if (input.music) {
    const duration = Math.min(MAX_NEWS_CAPSULE_SECONDS, Math.ceil((voiceDuration + 1.2) * 10) / 10)
    audio = await mix({
      music: input.music,
      voice,
      duration,
      voiceDelaySeconds: 0.45,
      musicVolume: 0.16,
      introSeconds: 0.7,
      introVolume: 0.42,
      bedVolume: 0.16,
      loopMusic: true,
    })
  }

  const finalDuration = (await probe(audio)) || voiceDuration
  if (finalDuration > MAX_NEWS_CAPSULE_SECONDS) {
    throw new Error(`La cápsula supera el máximo de ${MAX_NEWS_CAPSULE_SECONDS} segundos.`)
  }
  return {
    audio,
    duration: Math.round(finalDuration * 10) / 10,
    ttsCharacters,
    ttsCached,
  }
}
