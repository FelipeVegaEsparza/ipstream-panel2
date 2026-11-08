// Une las frases de la locución con pequeños silencios y SFX de
// transición, y aplica el color vintage a la primera frase en retro.
// El resultado entra al mezclador como una sola pista de voz.

import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import type { JingleStyleId } from '@/lib/jingle-fx'
import { SFX_VOLUME, sfxFile, type JingleSfxId } from '@/lib/jingle-sfx'

const execFileAsync = promisify(execFile)

export interface VoiceChunk {
  audio: Buffer
  duration: number
}

const GAP_SECONDS: Record<JingleStyleId, number> = {
  classic: 0,
  modern: 0.32,
  energy: 0.24,
  cinema: 0.42,
  retro: 0.3,
  pop: 0.28,
  chill: 0.38,
  news: 0.18,
  sport: 0.24,
  kids: 0.28,
  elegant: 0.4,
  arcade: 0.2,
}

const WHOOSH_LEAD_SECONDS = 0.14
const SFX_DIR = path.join(process.cwd(), 'public', 'audio', 'jingle-fx')

function fixed(value: number): string {
  return Number(value.toFixed(3)).toString()
}

async function runComposition(
  chunks: VoiceChunk[],
  style: JingleStyleId,
  transitionSfx: JingleSfxId | 'none',
  withSfx: boolean,
  retuneFirst: boolean
): Promise<Buffer> {
  const gap = GAP_SECONDS[style] ?? 0.3
  const offsets: number[] = []
  let cursor = 0
  for (const chunk of chunks) {
    offsets.push(cursor)
    cursor += chunk.duration + gap
  }
  const total = Math.max(1, cursor - gap)

  let sfx: Buffer | null = null
  if (withSfx && transitionSfx !== 'none') {
    sfx = await fs.readFile(path.join(SFX_DIR, sfxFile(transitionSfx))).catch(() => null)
  }

  const dir = await fs.mkdtemp(path.join(tmpdir(), 'jingle-voice-'))
  const outputPath = path.join(dir, 'voice.mp3')
  try {
    const inputPaths: string[] = []
    for (let i = 0; i < chunks.length; i += 1) {
      const filePath = path.join(dir, `chunk-${i}.mp3`)
      await fs.writeFile(filePath, chunks[i].audio)
      inputPaths.push(filePath)
    }
    if (sfx) {
      const sfxPath = path.join(dir, 'transition.mp3')
      await fs.writeFile(sfxPath, sfx)
      inputPaths.push(sfxPath)
    }

    const branches: string[] = []
    const mixLabels: string[] = []
    for (let i = 0; i < chunks.length; i += 1) {
      const duration = Math.max(0.1, chunks[i].duration)
      const fadeOut = Math.max(0, duration - 0.015)
      const special =
        retuneFirst && i === 0
          ? 'highpass=f=320,lowpass=f=3400,acrusher=bits=12:mix=0.1,'
          : ''
      branches.push(
        `[${i}:a]${special}aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.012,afade=t=out:st=${fixed(fadeOut)}:d=0.015,adelay=${Math.round(offsets[i] * 1000)}|${Math.round(offsets[i] * 1000)},apad=whole_dur=${fixed(total)}[c${i}]`
      )
      mixLabels.push(`[c${i}]`)
    }

    if (sfx && transitionSfx !== 'none') {
      const sfxIndex = chunks.length
      const level = SFX_VOLUME[transitionSfx]
      for (let i = 1; i < chunks.length; i += 1) {
        const start = Math.max(0, offsets[i] - WHOOSH_LEAD_SECONDS)
        branches.push(
          `[${sfxIndex}:a]atrim=0:0.6,asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,volume=${fixed(level)},adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)},apad=whole_dur=${fixed(total)}[w${i}]`
        )
        mixLabels.push(`[w${i}]`)
      }
    }

    branches.push(
      `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=longest:dropout_transition=0:normalize=0[out]`
    )

    const args = ['-y']
    for (const inputPath of inputPaths) args.push('-i', inputPath)
    args.push(
      '-filter_complex',
      branches.join(';'),
      '-map',
      '[out]',
      '-t',
      fixed(total),
      '-ar',
      '44100',
      '-ac',
      '2',
      '-b:a',
      '192k',
      outputPath
    )
    await execFileAsync('ffmpeg', args, { timeout: 90_000 })
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function composeJingleVoice(input: {
  chunks: VoiceChunk[]
  style: JingleStyleId
  transitionSfx?: JingleSfxId | 'none'
  retuneFirst?: boolean
}): Promise<{ audio: Buffer; duration: number }> {
  const chunks = input.chunks.filter((chunk) => chunk.audio.length > 0)
  if (chunks.length === 0) throw new Error('No hay locución para componer.')
  if (chunks.length === 1) {
    return { audio: chunks[0].audio, duration: chunks[0].duration }
  }

  const gap = GAP_SECONDS[input.style] ?? 0.3
  const total =
    chunks.reduce((sum, chunk) => sum + chunk.duration, 0) + gap * (chunks.length - 1)
  const transitionSfx = input.transitionSfx ?? 'none'
  const retuneFirst = input.retuneFirst ?? input.style === 'retro'

  try {
    const audio = await runComposition(chunks, input.style, transitionSfx, true, retuneFirst)
    return { audio, duration: Math.round(total * 1000) / 1000 }
  } catch {
    // Si el SFX falla (archivo ausente o filtro no disponible),
    // se compone igual sin efectos de transición.
    const audio = await runComposition(chunks, input.style, transitionSfx, false, retuneFirst)
    return { audio, duration: Math.round(total * 1000) / 1000 }
  }
}
