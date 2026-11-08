// =====================================================
// Jingle FX: estilos, estructura y pulido de voz.
// Todo es post-proceso FFmpeg: no cambia la voz de la IA
// ni consume cuota adicional.
// =====================================================

import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { probeAudioBufferDuration, probeAudioDuration } from '@/lib/audio-mix'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'

const execFileAsync = promisify(execFile)

export const JINGLE_STYLES = ['classic', 'modern', 'energy', 'cinema', 'retro'] as const
export type JingleStyleId = (typeof JINGLE_STYLES)[number]
export const DEFAULT_JINGLE_STYLE: JingleStyleId = 'modern'
export const DEFAULT_JINGLE_INTENSITY = 65

export function isJingleStyleId(value: unknown): value is JingleStyleId {
  return typeof value === 'string' && (JINGLE_STYLES as readonly string[]).includes(value)
}

interface StyleConfig {
  riserSeconds: number
  voiceLeadSeconds: number
  tailSeconds: number
  introLevel: number
  bedLevel: number
  tailLevel: number
  musicCarveDb: number
  duckRatio: number
  riserLevel: number
  impactLevel: number
  impactFrequency: number
  presenceDb: number
  presenceFrequency: number
  highPassHz: number
  lowPassHz?: number
  airShelfDb?: number
  warmShelfDb?: number
  exciterAmount: number
  exciterFrequency: number
  compressorRatio: number
  compressorAttack: number
  compressorRelease: number
  compressorMakeup: number
  echo?: { inGain: number; outGain: number; delays: string; decays: string }
  pitchFactor?: number
  durationFactor?: number
  grit?: number
}

const STYLE_CONFIG: Record<JingleStyleId, StyleConfig> = {
  // El comportamiento original: cama + voz, sin adornos.
  classic: {
    riserSeconds: 0,
    voiceLeadSeconds: 0.4,
    tailSeconds: 1,
    introLevel: 0.55,
    bedLevel: 0.35,
    tailLevel: 0.4,
    musicCarveDb: 0,
    duckRatio: 8,
    riserLevel: 0,
    impactLevel: 0,
    impactFrequency: 60,
    presenceDb: 2,
    presenceFrequency: 3200,
    highPassHz: 90,
    exciterAmount: 0.6,
    exciterFrequency: 7000,
    compressorRatio: 2.5,
    compressorAttack: 5,
    compressorRelease: 80,
    compressorMakeup: 1,
  },
  // Radio imaging: voz brillante, doblada y con aire.
  modern: {
    riserSeconds: 0.85,
    voiceLeadSeconds: 0.15,
    tailSeconds: 1.8,
    introLevel: 0.6,
    bedLevel: 0.26,
    tailLevel: 0.45,
    musicCarveDb: 2.5,
    duckRatio: 10,
    riserLevel: 0.13,
    impactLevel: 0.32,
    impactFrequency: 60,
    presenceDb: 5.5,
    presenceFrequency: 3300,
    highPassHz: 95,
    airShelfDb: 3.5,
    exciterAmount: 2.2,
    exciterFrequency: 6000,
    compressorRatio: 3.2,
    compressorAttack: 5,
    compressorRelease: 110,
    compressorMakeup: 1.5,
    echo: { inGain: 0.9, outGain: 0.42, delays: '16|42', decays: '0.24|0.1' },
  },
  // Promo EDM: más filo, más rápido y con slap corto.
  energy: {
    riserSeconds: 0.7,
    voiceLeadSeconds: 0.1,
    tailSeconds: 1.5,
    introLevel: 0.62,
    bedLevel: 0.22,
    tailLevel: 0.42,
    musicCarveDb: 3,
    duckRatio: 12,
    riserLevel: 0.15,
    impactLevel: 0.4,
    impactFrequency: 70,
    presenceDb: 7,
    presenceFrequency: 3500,
    highPassHz: 105,
    airShelfDb: 5,
    exciterAmount: 2.8,
    exciterFrequency: 6800,
    compressorRatio: 3.8,
    compressorAttack: 3.5,
    compressorRelease: 90,
    compressorMakeup: 1.7,
    echo: { inGain: 0.85, outGain: 0.45, delays: '20|38', decays: '0.24|0.14' },
    durationFactor: 0.95,
    grit: 0.06,
  },
  // Trailer: voz más grave, oscura y con reverb amplia.
  cinema: {
    riserSeconds: 1.2,
    voiceLeadSeconds: 0.2,
    tailSeconds: 2.2,
    introLevel: 0.5,
    bedLevel: 0.28,
    tailLevel: 0.5,
    musicCarveDb: 2,
    duckRatio: 8,
    riserLevel: 0.16,
    impactLevel: 0.5,
    impactFrequency: 45,
    presenceDb: 0.5,
    presenceFrequency: 2800,
    highPassHz: 70,
    warmShelfDb: 4.5,
    airShelfDb: -2,
    exciterAmount: 0.7,
    exciterFrequency: 5000,
    compressorRatio: 2.6,
    compressorAttack: 12,
    compressorRelease: 220,
    compressorMakeup: 1.3,
    echo: { inGain: 0.9, outGain: 0.6, delays: '180|320|520', decays: '0.26|0.18|0.1' },
    pitchFactor: 0.94,
    durationFactor: 1.03,
  },
  // Vintage: banda angosta, saturación y slap de cinta.
  retro: {
    riserSeconds: 0.5,
    voiceLeadSeconds: 0.1,
    tailSeconds: 1.2,
    introLevel: 0.55,
    bedLevel: 0.3,
    tailLevel: 0.4,
    musicCarveDb: 1.5,
    duckRatio: 8,
    riserLevel: 0.1,
    impactLevel: 0.25,
    impactFrequency: 90,
    presenceDb: 4,
    presenceFrequency: 1900,
    highPassHz: 300,
    lowPassHz: 3400,
    exciterAmount: 1.6,
    exciterFrequency: 4200,
    compressorRatio: 4,
    compressorAttack: 4,
    compressorRelease: 140,
    compressorMakeup: 1.6,
    echo: { inGain: 0.8, outGain: 0.55, delays: '70|140', decays: '0.24|0.14' },
    pitchFactor: 0.95,
    grit: 0.22,
  },
}


const STYLE_DIRECTIONS: Record<JingleStyleId, string> = {
  classic: FISH_AUDIO_DIRECTIONS.station,
  modern: '[voz de locutor, energética y segura]',
  energy: '[voz de locutor, muy enérgica y potente]',
  cinema: '[voz profunda, dramática y pausada]',
  retro: '[voz de locutor clásico, cálida y pausada]',
}

export function resolveJingleDirection(style: unknown): string {
  return STYLE_DIRECTIONS[isJingleStyleId(style) ? style : DEFAULT_JINGLE_STYLE]
}

export interface ResolvedJingleFx extends StyleConfig {
  style: JingleStyleId
  intensity: number
  voiceFx: boolean
}

export function resolveJingleFx(
  style: unknown,
  intensity: unknown,
  voiceFx: boolean
): ResolvedJingleFx {
  const id = isJingleStyleId(style) ? style : DEFAULT_JINGLE_STYLE
  const raw = Number(intensity)
  const clamped = Number.isFinite(raw)
    ? Math.max(0, Math.min(100, raw))
    : DEFAULT_JINGLE_INTENSITY
  const factor = 0.55 + (clamped / 100) * 1.05
  const base = STYLE_CONFIG[id]
  const scale = (value: number) => Math.round(value * factor * 1000) / 1000
  const echo = base.echo
    ? {
        ...base.echo,
        decays: base.echo.decays
          .split('|')
          .map((decay) =>
            String(Math.round(Math.min(0.85, Number(decay) * factor) * 100) / 100)
          )
          .join('|'),
      }
    : undefined

  return {
    ...base,
    style: id,
    intensity: clamped,
    voiceFx,
    bedLevel: Math.round(base.bedLevel * (1.08 - (clamped / 100) * 0.28) * 1000) / 1000,
    introLevel: Math.round(base.introLevel * 1000) / 1000,
    tailLevel: Math.round(base.tailLevel * 1000) / 1000,
    riserLevel: scale(base.riserLevel),
    impactLevel: scale(base.impactLevel),
    musicCarveDb: scale(base.musicCarveDb),
    duckRatio: Math.round(base.duckRatio * (0.85 + (clamped / 100) * 0.35) * 10) / 10,
    presenceDb: Math.min(8, scale(base.presenceDb)),
    airShelfDb:
      base.airShelfDb != null
        ? Math.min(5.5, Math.max(-6, scale(base.airShelfDb)))
        : undefined,
    exciterAmount: voiceFx ? Math.min(3, scale(base.exciterAmount)) : 0,
    grit: voiceFx && base.grit ? Math.min(0.45, scale(base.grit)) : 0,
    echo,
  }
}

export interface JingleMixStructure {
  totalSeconds: number
  voiceStartSeconds: number
  voiceDurationSeconds: number | null
  musicStartSeconds?: number
}

/**
 * Estima la estructura sin correr FFmpeg. Si la voz no entra en la
 * duración pedida, el jingle se extiende en vez de cortar la locución.
 */
export function planJingleStructure(input: {
  requestedDuration: number
  voiceDurationSeconds: number | null
  fx: ResolvedJingleFx
  musicStartSeconds?: number
  voiceStartSeconds?: number
}): JingleMixStructure {
  const { requestedDuration, voiceDurationSeconds, fx } = input
  const baseStart = Math.round((fx.riserSeconds + fx.voiceLeadSeconds) * 1000) / 1000
  const voiceStartSeconds =
    typeof input.voiceStartSeconds === 'number' && input.voiceStartSeconds > 0
      ? Math.round(input.voiceStartSeconds * 1000) / 1000
      : baseStart
  // El pitch/tempo del estilo cambia la duración real de la voz.
  const durationFactor = fx.voiceFx ? (fx.durationFactor ?? 1) : 1
  const effectiveVoiceDuration = voiceDurationSeconds
    ? Math.round(voiceDurationSeconds * durationFactor * 1000) / 1000
    : null
  const naturalEnd = effectiveVoiceDuration
    ? voiceStartSeconds + effectiveVoiceDuration + fx.tailSeconds
    : requestedDuration
  const totalSeconds = Math.ceil(Math.max(requestedDuration, naturalEnd) * 10) / 10
  return {
    totalSeconds,
    voiceStartSeconds,
    voiceDurationSeconds: effectiveVoiceDuration,
    musicStartSeconds: input.musicStartSeconds ?? 0,
  }
}

function fixed(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function buildVoiceChain(fx: ResolvedJingleFx): string {
  const parts: string[] = []
  parts.push('aformat=channel_layouts=stereo')

  // Pitch y velocidad: cambian el carácter sin volver a sintetizar.
  if (fx.voiceFx) {
    const pitch = fx.pitchFactor ?? 1
    const duration = fx.durationFactor ?? 1
    if (Math.abs(pitch - 1) > 0.001) {
      parts.push(`asetrate=${Math.round(44100 * pitch)}`)
      parts.push('aresample=44100')
    }
    const tempo = 1 / Math.max(0.01, pitch * duration)
    if (Math.abs(tempo - 1) > 0.001) {
      parts.push(`atempo=${fixed(Math.min(2, Math.max(0.5, tempo)))}`)
    }
  }

  parts.push(`highpass=f=${fx.voiceFx ? fx.highPassHz : 90}`)
  if (fx.voiceFx && fx.lowPassHz) parts.push(`lowpass=f=${Math.round(fx.lowPassHz)}`)
  if (fx.voiceFx) parts.push('deesser=i=0.45')
  if (fx.voiceFx && fx.warmShelfDb) {
    parts.push(`equalizer=f=180:t=q:w=1:g=${fixed(fx.warmShelfDb)}`)
  }
  parts.push('equalizer=f=250:t=q:w=1:g=-1.2')
  parts.push(`equalizer=f=${fx.presenceFrequency}:t=q:w=1.2:g=${fixed(fx.presenceDb)}`)
  if (fx.voiceFx && fx.airShelfDb) {
    parts.push(`equalizer=f=8500:t=h:g=${fixed(fx.airShelfDb)}`)
  }
  parts.push(
    `acompressor=threshold=-18dB:ratio=${fixed(fx.compressorRatio)}:attack=${fixed(fx.compressorAttack)}:release=${fixed(fx.compressorRelease)}:makeup=${fixed(fx.compressorMakeup)}`
  )
  if (fx.voiceFx && fx.exciterAmount > 0) {
    parts.push(`aexciter=amount=${fixed(fx.exciterAmount)}:freq=${Math.round(fx.exciterFrequency)}`)
  }
  if (fx.voiceFx && fx.grit && fx.grit > 0) {
    parts.push(`acrusher=bits=11:mix=${fixed(fx.grit)}:mode=1`)
  }
  if (fx.voiceFx && fx.echo) {
    parts.push(
      `aecho=${fixed(fx.echo.inGain)}:${fixed(fx.echo.outGain)}:${fx.echo.delays}:${fx.echo.decays}`
    )
  }
  return parts.join(',')
}

export interface JingleSfxInputs {
  /** Etiqueta de entrada FFmpeg para el riser, por ejemplo "2:a". */
  riser?: string
  /** Etiqueta de entrada FFmpeg para el impacto, por ejemplo "3:a". */
  impact?: string
}

export function buildJingleFilter(
  structure: JingleMixStructure,
  fx: ResolvedJingleFx,
  sfx: JingleSfxInputs = {}
): string {
  const total = structure.totalSeconds
  const voiceStart = structure.voiceStartSeconds
  const voiceDuration =
    structure.voiceDurationSeconds ?? Math.max(0.5, total - voiceStart - fx.tailSeconds)
  const voiceEnd = Math.min(total, voiceStart + voiceDuration)
  const restore = Math.min(total, voiceEnd + 0.2)
  const fadeOut = Math.max(0.2, total - 0.9)
  const voiceDelayMs = Math.round(voiceStart * 1000)
  const musicStart = structure.musicStartSeconds ?? 0

  const bedVolume = `volume='if(lt(t,${fixed(voiceStart)}),${fixed(fx.introLevel)},if(lt(t,${fixed(restore)}),${fixed(fx.bedLevel)},${fixed(fx.tailLevel)}))':eval=frame`
  const bedChain = [
    `atrim=start=${fixed(musicStart)}:duration=${fixed(total)}`,
    'asetpts=PTS-STARTPTS',
    'highpass=f=70',
    fx.musicCarveDb > 0
      ? `equalizer=f=2600:t=q:w=1.1:g=-${fixed(fx.musicCarveDb)}`
      : null,
    bedVolume,
    'afade=t=in:st=0:d=0.12',
    `afade=t=out:st=${fixed(fadeOut)}:d=0.9`,
  ]
    .filter(Boolean)
    .join(',')

  const voiceChain = [
    buildVoiceChain(fx),
    `adelay=${voiceDelayMs}|${voiceDelayMs}`,
    `apad=whole_dur=${fixed(total)}`,
  ].join(',')

  const branches: string[] = []
  branches.push(`[0:a]${bedChain}[bed]`)
  branches.push(`[1:a]${voiceChain},asplit=2[voice][duck]`)
  branches.push(
    `[bed][duck]sidechaincompress=threshold=0.05:ratio=${fixed(fx.duckRatio)}:attack=20:release=250[bedduck]`
  )

  const mixInputs = ['[bedduck]', '[voice]']

  if (fx.riserSeconds > 0 && fx.riserLevel > 0) {
    const fadeOutRiser = Math.max(0.05, fx.riserSeconds - 0.18)
    if (sfx.riser) {
      const level = Math.min(0.5, fx.riserLevel * 2.2)
      branches.push(
        `[${sfx.riser}]atrim=start=0:duration=${fixed(fx.riserSeconds)},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,volume=${fixed(level)},afade=t=out:st=${fixed(fadeOutRiser)}:d=0.18[riser]`
      )
    } else {
      // Fallback sintético si la librería de SFX no está disponible.
      const riser = `aevalsrc=exprs='0.3*sin(2*PI*(150*t+700*t*t))*(0.4+0.6*t)+0.14*sin(2*PI*(153*t+712*t*t))+0.1*(random(0)-0.5)*(1-exp(-8*t))':d=${fixed(fx.riserSeconds)}:s=44100`
      branches.push(
        `${riser},aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.06,afade=t=out:st=${fixed(fadeOutRiser)}:d=0.15,volume=${fixed(fx.riserLevel)}[riser]`
      )
    }
    mixInputs.push('[riser]')
  }

  if (fx.impactLevel > 0) {
    const impactDelay = Math.max(0, voiceDelayMs - 40)
    if (sfx.impact) {
      const level = Math.min(0.65, fx.impactLevel * 1.5)
      branches.push(
        `[${sfx.impact}]atrim=start=0:duration=1,asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,afade=t=out:st=0.7:d=0.3,adelay=${impactDelay}|${impactDelay},volume=${fixed(level)}[impact]`
      )
    } else {
      const impact = `aevalsrc=exprs='0.8*sin(2*PI*${Math.round(fx.impactFrequency)}*t)*exp(-9*t)+0.2*sin(2*PI*${Math.round(fx.impactFrequency * 2)}*t)*exp(-14*t)':d=0.8:s=44100`
      branches.push(
        `${impact},aformat=channel_layouts=stereo,afade=t=out:st=0.55:d=0.25,adelay=${impactDelay}|${impactDelay},volume=${fixed(fx.impactLevel)}[impact]`
      )
    }
    mixInputs.push('[impact]')
  }

  branches.push(
    `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:dropout_transition=0:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.95[out]`
  )

  return branches.join(';')
}

export interface MixJingleResult {
  audio: Buffer
  duration: number
  style: JingleStyleId
}

export async function mixJingle(options: {
  music: Buffer
  voice: Buffer
  requestedDuration: number
  style?: unknown
  intensity?: unknown
  voiceFx?: boolean
  musicStartSeconds?: number
  voiceStartSeconds?: number
}): Promise<MixJingleResult> {
  const fx = resolveJingleFx(options.style, options.intensity, options.voiceFx !== false)
  const voiceDuration = await probeAudioBufferDuration(options.voice)
  const structure = planJingleStructure({
    requestedDuration: options.requestedDuration,
    voiceDurationSeconds: voiceDuration,
    fx,
    musicStartSeconds: options.musicStartSeconds,
    voiceStartSeconds: options.voiceStartSeconds,
  })

  const sfxDir = path.join(process.cwd(), 'public', 'audio', 'jingle-fx')
  const [riserAsset, impactAsset] = await Promise.all([
    fx.riserLevel > 0 && fx.riserSeconds > 0
      ? fs.readFile(path.join(sfxDir, 'riser.mp3')).catch(() => null)
      : Promise.resolve(null),
    fx.impactLevel > 0
      ? fs.readFile(path.join(sfxDir, 'impact.mp3')).catch(() => null)
      : Promise.resolve(null),
  ])

  const dir = await fs.mkdtemp(path.join(tmpdir(), 'jingle-mix-'))
  const musicPath = path.join(dir, 'music.mp3')
  const voicePath = path.join(dir, 'voice.mp3')
  const outputPath = path.join(dir, 'jingle.mp3')
  try {
    await fs.writeFile(musicPath, options.music)
    await fs.writeFile(voicePath, options.voice)

    const extraInputs: string[] = []
    let nextIndex = 2
    const sfxInputs: JingleSfxInputs = {}
    if (riserAsset) {
      const riserPath = path.join(dir, 'riser.mp3')
      await fs.writeFile(riserPath, riserAsset)
      extraInputs.push(riserPath)
      sfxInputs.riser = `${nextIndex}:a`
      nextIndex += 1
    }
    if (impactAsset) {
      const impactPath = path.join(dir, 'impact.mp3')
      await fs.writeFile(impactPath, impactAsset)
      extraInputs.push(impactPath)
      sfxInputs.impact = `${nextIndex}:a`
      nextIndex += 1
    }

    const filter = buildJingleFilter(structure, fx, sfxInputs)
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-stream_loop',
        '-1',
        '-i',
        musicPath,
        '-i',
        voicePath,
        ...extraInputs.flatMap((inputPath) => ['-i', inputPath]),
        '-filter_complex',
        filter,
        '-map',
        '[out]',
        '-t',
        fixed(structure.totalSeconds),
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        '192k',
        outputPath,
      ],
      { timeout: 120_000 }
    )
    const audio = await fs.readFile(outputPath)
    const probed = await probeAudioDuration(outputPath)
    return {
      audio,
      duration: probed ? Math.round(probed * 10) / 10 : structure.totalSeconds,
      style: fx.style,
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
