import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface MusicVoiceMixOptions {
  music: Buffer
  voice: Buffer
  duration: number
  voiceDelaySeconds: number
  musicVolume: number
  introSeconds?: number
  introVolume?: number
  bedVolume?: number
  loopMusic?: boolean
}

export function buildMusicVoiceFilter(options: MusicVoiceMixOptions): string {
  const {
    duration,
    voiceDelaySeconds,
    musicVolume,
    introSeconds = 0,
    introVolume = musicVolume,
    bedVolume = musicVolume,
  } = options
  const delayMs = Math.max(0, Math.round(voiceDelaySeconds * 1000))
  const fadeOut = Math.max(0.2, duration - 0.8)
  const musicVolumeFilter =
    introSeconds > 0
      ? `volume=${introVolume}:enable='lt(t,${introSeconds})',volume=${bedVolume}:enable='gte(t,${introSeconds})'`
      : `volume=${musicVolume}`

  return [
    `[0:a]atrim=0:${duration},asetpts=PTS-STARTPTS,${musicVolumeFilter},highpass=f=80,equalizer=f=250:t=q:w=1:g=-1,afade=t=in:st=0:d=0.25,afade=t=out:st=${fadeOut.toFixed(2)}:d=0.8[music]`,
    `[1:a]highpass=f=80,equalizer=f=3200:t=q:w=1:g=2,acompressor=threshold=-18dB:ratio=2.5:attack=5:release=80,adelay=${delayMs}|${delayMs},asplit=2[voice][side]`,
    `[voice]apad=whole_dur=${duration}[voicepad]`,
    `[side]apad=whole_dur=${duration}[sidepad]`,
    `[music][sidepad]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=300[ducked]`,
    `[ducked][voicepad]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.95[out]`,
  ].join(';')
}

export async function mixMusicAndVoice(options: MusicVoiceMixOptions): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'audio-mix-'))
  const musicPath = path.join(dir, 'music.mp3')
  const voicePath = path.join(dir, 'voice.mp3')
  const outputPath = path.join(dir, 'mix.mp3')
  try {
    await fs.writeFile(musicPath, options.music)
    await fs.writeFile(voicePath, options.voice)
    const args = [
      '-y',
      ...(options.loopMusic ? ['-stream_loop', '-1'] : []),
      '-i',
      musicPath,
      '-i',
      voicePath,
      '-filter_complex',
      buildMusicVoiceFilter(options),
      '-map',
      '[out]',
      '-t',
      String(options.duration),
      '-ar',
      '44100',
      '-ac',
      '2',
      '-b:a',
      '192k',
      outputPath,
    ]
    await execFileAsync('ffmpeg', args, { timeout: 90_000 })
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function probeAudioBufferDuration(buffer: Buffer): Promise<number | null> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'audio-probe-'))
  const filePath = path.join(dir, 'audio.mp3')
  try {
    await fs.writeFile(filePath, buffer)
    return await probeAudioDuration(filePath)
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function probeAudioDuration(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath,
      ],
      { timeout: 15_000 }
    )
    const seconds = Number(String(stdout).trim())
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null
  } catch {
    return null
  }
}
