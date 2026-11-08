// =====================================================
// Jingle FX: estilos, estructura, sonidos y voz.
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
import {
  SFX_DURATION_SECONDS,
  SFX_VOLUME,
  isJingleSfxId,
  sfxFile,
  type JingleSfxId,
} from '@/lib/jingle-sfx'

const execFileAsync = promisify(execFile)

export const JINGLE_STYLES = [
  'classic',
  'modern',
  'energy',
  'cinema',
  'retro',
  'pop',
  'chill',
  'news',
  'sport',
  'kids',
  'elegant',
  'arcade',
] as const
export type JingleStyleId = (typeof JINGLE_STYLES)[number]
export const DEFAULT_JINGLE_STYLE: JingleStyleId = 'modern'
export const DEFAULT_JINGLE_INTENSITY = 65

export const JINGLE_VOICE_CHARACTERS = [
  'auto',
  'natural',
  'bright',
  'warm',
  'deep',
  'phone',
  'saturated',
  'doubled',
] as const
export type JingleVoiceCharacter = (typeof JINGLE_VOICE_CHARACTERS)[number]

export function isJingleStyleId(value: unknown): value is JingleStyleId {
  return typeof value === 'string' && (JINGLE_STYLES as readonly string[]).includes(value)
}

export function isJingleVoiceCharacter(value: unknown): value is JingleVoiceCharacter {
  return (
    typeof value === 'string' &&
    (JINGLE_VOICE_CHARACTERS as readonly string[]).includes(value)
  )
}

type SfxChoice = JingleSfxId | 'none'

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
  introSfx: SfxChoice
  impactSfx: SfxChoice
  transitionSfx: SfxChoice
  outroSfx: SfxChoice
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

const ECHO_SHORT = { inGain: 0.9, outGain: 0.42, delays: '16|42', decays: '0.24|0.1' }

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
    introSfx: 'none',
    impactSfx: 'none',
    transitionSfx: 'none',
    outroSfx: 'none',
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
    introSfx: 'riser',
    impactSfx: 'impact',
    transitionSfx: 'whoosh',
    outroSfx: 'stinger',
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
    echo: ECHO_SHORT,
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
    introSfx: 'subdrop',
    impactSfx: 'boom',
    transitionSfx: 'whoosh',
    outroSfx: 'stinger',
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
    introSfx: 'riser',
    impactSfx: 'boom',
    transitionSfx: 'reverse',
    outroSfx: 'reverse',
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
    introSfx: 'vinyl',
    impactSfx: 'click',
    transitionSfx: 'vinyl',
    outroSfx: 'reverse',
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
  // Pop: alegre, brillante y con campanillas.
  pop: {
    riserSeconds: 0.7,
    voiceLeadSeconds: 0.12,
    tailSeconds: 1.5,
    introLevel: 0.6,
    bedLevel: 0.26,
    tailLevel: 0.44,
    musicCarveDb: 2.5,
    duckRatio: 10,
    riserLevel: 0.13,
    impactLevel: 0.3,
    impactFrequency: 80,
    introSfx: 'riser',
    impactSfx: 'ding',
    transitionSfx: 'whoosh',
    outroSfx: 'ding',
    presenceDb: 5,
    presenceFrequency: 3300,
    highPassHz: 95,
    airShelfDb: 2.5,
    exciterAmount: 1.8,
    exciterFrequency: 6200,
    compressorRatio: 3.1,
    compressorAttack: 4,
    compressorRelease: 100,
    compressorMakeup: 1.5,
    echo: { inGain: 0.85, outGain: 0.4, delays: '30|60', decays: '0.2|0.1' },
    durationFactor: 0.99,
  },
  // Chill: cálido, suave y con vinilo.
  chill: {
    riserSeconds: 0.8,
    voiceLeadSeconds: 0.18,
    tailSeconds: 2.2,
    introLevel: 0.55,
    bedLevel: 0.24,
    tailLevel: 0.42,
    musicCarveDb: 2,
    duckRatio: 8,
    riserLevel: 0.1,
    impactLevel: 0.2,
    impactFrequency: 55,
    introSfx: 'sweep',
    impactSfx: 'click',
    transitionSfx: 'vinyl',
    outroSfx: 'reverse',
    presenceDb: 1,
    presenceFrequency: 2500,
    highPassHz: 80,
    warmShelfDb: 3,
    airShelfDb: -1.5,
    exciterAmount: 0.8,
    exciterFrequency: 5500,
    compressorRatio: 2.4,
    compressorAttack: 8,
    compressorRelease: 180,
    compressorMakeup: 1.2,
    echo: { inGain: 0.85, outGain: 0.45, delays: '120', decays: '0.14' },
    pitchFactor: 0.98,
    durationFactor: 1.02,
  },
  // News: claro, urgente y sin adornos.
  news: {
    riserSeconds: 0.35,
    voiceLeadSeconds: 0.08,
    tailSeconds: 0.8,
    introLevel: 0.5,
    bedLevel: 0.2,
    tailLevel: 0.36,
    musicCarveDb: 3,
    duckRatio: 12,
    riserLevel: 0.08,
    impactLevel: 0.18,
    impactFrequency: 90,
    introSfx: 'click',
    impactSfx: 'click',
    transitionSfx: 'click',
    outroSfx: 'stinger',
    presenceDb: 6,
    presenceFrequency: 3100,
    highPassHz: 120,
    airShelfDb: 1.5,
    exciterAmount: 1.6,
    exciterFrequency: 6500,
    compressorRatio: 3.6,
    compressorAttack: 3,
    compressorRelease: 70,
    compressorMakeup: 1.6,
    durationFactor: 0.97,
  },
  // Sport: relato potente, bombo y estadio.
  sport: {
    riserSeconds: 0.75,
    voiceLeadSeconds: 0.1,
    tailSeconds: 1.4,
    introLevel: 0.62,
    bedLevel: 0.22,
    tailLevel: 0.44,
    musicCarveDb: 2.8,
    duckRatio: 12,
    riserLevel: 0.16,
    impactLevel: 0.45,
    impactFrequency: 65,
    introSfx: 'subdrop',
    impactSfx: 'boom',
    transitionSfx: 'whoosh',
    outroSfx: 'stinger',
    presenceDb: 7,
    presenceFrequency: 3400,
    highPassHz: 110,
    airShelfDb: 3,
    exciterAmount: 2.6,
    exciterFrequency: 6600,
    compressorRatio: 3.6,
    compressorAttack: 3,
    compressorRelease: 80,
    compressorMakeup: 1.7,
    echo: { inGain: 0.85, outGain: 0.42, delays: '24', decays: '0.12' },
    durationFactor: 0.98,
    grit: 0.05,
  },
  // Kids: juguetón, más agudo y con chispas.
  kids: {
    riserSeconds: 0.6,
    voiceLeadSeconds: 0.12,
    tailSeconds: 1.4,
    introLevel: 0.6,
    bedLevel: 0.28,
    tailLevel: 0.44,
    musicCarveDb: 2,
    duckRatio: 9,
    riserLevel: 0.12,
    impactLevel: 0.26,
    impactFrequency: 100,
    introSfx: 'sparkle',
    impactSfx: 'ding',
    transitionSfx: 'sparkle',
    outroSfx: 'sparkle',
    presenceDb: 5,
    presenceFrequency: 3500,
    highPassHz: 130,
    airShelfDb: 4,
    exciterAmount: 2.2,
    exciterFrequency: 7000,
    compressorRatio: 3,
    compressorAttack: 4,
    compressorRelease: 90,
    compressorMakeup: 1.5,
    echo: { inGain: 0.85, outGain: 0.4, delays: '40', decays: '0.12' },
    pitchFactor: 1.04,
    durationFactor: 0.97,
  },
  // Elegant: sobrio, lento y con aire de lujo.
  elegant: {
    riserSeconds: 1,
    voiceLeadSeconds: 0.2,
    tailSeconds: 2.4,
    introLevel: 0.5,
    bedLevel: 0.26,
    tailLevel: 0.5,
    musicCarveDb: 2,
    duckRatio: 8,
    riserLevel: 0.12,
    impactLevel: 0.24,
    impactFrequency: 50,
    introSfx: 'sweep',
    impactSfx: 'ding',
    transitionSfx: 'sparkle',
    outroSfx: 'reverse',
    presenceDb: 2,
    presenceFrequency: 2900,
    highPassHz: 80,
    warmShelfDb: 3,
    airShelfDb: 1,
    exciterAmount: 0.9,
    exciterFrequency: 5800,
    compressorRatio: 2.5,
    compressorAttack: 10,
    compressorRelease: 200,
    compressorMakeup: 1.2,
    echo: { inGain: 0.9, outGain: 0.55, delays: '160|300', decays: '0.2|0.12' },
    pitchFactor: 0.97,
    durationFactor: 1.03,
  },
  // Arcade: 8-bit, saturación y clicks.
  arcade: {
    riserSeconds: 0.5,
    voiceLeadSeconds: 0.1,
    tailSeconds: 0.9,
    introLevel: 0.6,
    bedLevel: 0.2,
    tailLevel: 0.4,
    musicCarveDb: 3,
    duckRatio: 11,
    riserLevel: 0.12,
    impactLevel: 0.24,
    impactFrequency: 120,
    introSfx: 'sweep',
    impactSfx: 'click',
    transitionSfx: 'click',
    outroSfx: 'stinger',
    presenceDb: 5,
    presenceFrequency: 2600,
    highPassHz: 150,
    lowPassHz: 9000,
    airShelfDb: 2,
    exciterAmount: 2,
    exciterFrequency: 6000,
    compressorRatio: 3.4,
    compressorAttack: 3,
    compressorRelease: 80,
    compressorMakeup: 1.6,
    echo: { inGain: 0.85, outGain: 0.4, delays: '20', decays: '0.1' },
    pitchFactor: 1.02,
    durationFactor: 0.96,
    grit: 0.28,
  },
}

const STYLE_DIRECTIONS: Record<JingleStyleId, string> = {
  classic: FISH_AUDIO_DIRECTIONS.station,
  modern: '[voz de locutor, energética y segura]',
  energy: '[voz de locutor, muy enérgica y potente]',
  cinema: '[voz profunda, dramática y pausada]',
  retro: '[voz de locutor clásico, cálida y pausada]',
  pop: '[voz de locutor, alegre y enérgica]',
  chill: '[voz suave, cálida y relajada]',
  news: '[voz clara, urgente y profesional]',
  sport: '[voz de relator, potente y emocionada]',
  kids: '[voz divertida, luminosa y juguetona]',
  elegant: '[voz elegante, serena y sofisticada]',
  arcade: '[voz de locutor retro, divertida y rápida]',
}

export function resolveJingleDirection(style: unknown): string {
  return STYLE_DIRECTIONS[isJingleStyleId(style) ? style : DEFAULT_JINGLE_STYLE]
}

interface VoiceCharacterPreset {
  presenceDelta?: number
  airDelta?: number
  exciterDelta?: number
  warmShelfDb?: number
  highPassHz?: number
  lowPassHz?: number
  grit?: number
  pitchSemitones?: number
  doubling?: number
}

const VOICE_CHARACTERS: Record<JingleVoiceCharacter, VoiceCharacterPreset> = {
  auto: {},
  natural: { presenceDelta: -1.2, airDelta: -1, exciterDelta: -0.5 },
  bright: { presenceDelta: 2.5, airDelta: 2, exciterDelta: 0.9 },
  warm: { warmShelfDb: 3, presenceDelta: -1, airDelta: -1.5, exciterDelta: -0.3 },
  deep: { pitchSemitones: -2.5, warmShelfDb: 2.5 },
  phone: { highPassHz: 320, lowPassHz: 3400, presenceDelta: 1.5, airDelta: -3, grit: 0.18 },
  saturated: { grit: 0.24, presenceDelta: 1, airDelta: 0.5 },
  doubled: { doubling: 0.35, presenceDelta: 1 },
}

export interface JingleOverrides {
  introSfx?: string
  impactSfx?: string
  transitionSfx?: string
  outroSfx?: string
  voiceCharacter?: string
  pitchSemitones?: number
  speed?: number
  reverb?: number
  doubling?: number
}

export interface ResolvedJingleFx extends StyleConfig {
  style: JingleStyleId
  intensity: number
  voiceFx: boolean
  doubling: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function numeric(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function resolveJingleFx(
  style: unknown,
  intensity: unknown,
  voiceFx: boolean,
  overrides: JingleOverrides = {}
): ResolvedJingleFx {
  const id = isJingleStyleId(style) ? style : DEFAULT_JINGLE_STYLE
  const raw = numeric(intensity)
  const clamped = raw == null ? DEFAULT_JINGLE_INTENSITY : clamp(raw, 0, 100)
  const factor = 0.55 + (clamped / 100) * 1.05
  const base = STYLE_CONFIG[id]
  const scale = (value: number) => Math.round(value * factor * 1000) / 1000

  const characterId = voiceFx && isJingleVoiceCharacter(overrides.voiceCharacter)
    ? overrides.voiceCharacter
    : 'auto'
  const character = VOICE_CHARACTERS[characterId]

  const presenceDb = clamp(
    scale(base.presenceDb + (character.presenceDelta ?? 0)),
    -2,
    8
  )
  const airBase = (base.airShelfDb ?? 0) + (character.airDelta ?? 0)
  const airShelfDb =
    base.airShelfDb != null || character.airDelta != null
      ? clamp(scale(airBase), -6, 5.5)
      : undefined
  const exciterAmount = voiceFx
    ? clamp(scale(base.exciterAmount + (character.exciterDelta ?? 0)), 0, 3)
    : 0
  const warmShelfDb =
    character.warmShelfDb != null
      ? character.warmShelfDb
      : base.warmShelfDb != null
        ? scale(base.warmShelfDb)
        : undefined

  const semitones = clamp(
    (numeric(overrides.pitchSemitones) ?? 0) + (character.pitchSemitones ?? 0),
    -8,
    6
  )
  const speed = clamp(numeric(overrides.speed) ?? 1, 0.85, 1.15)
  const pitchFactor = (base.pitchFactor ?? 1) * Math.pow(2, semitones / 12)
  const durationFactor = (base.durationFactor ?? 1) / speed

  const reverbPercent = clamp(numeric(overrides.reverb) ?? 100, 0, 150)
  const decayScale = (reverbPercent / 100) * factor
  const echo =
    base.echo && reverbPercent > 0
      ? {
          ...base.echo,
          decays: base.echo.decays
            .split('|')
            .map((decay) => String(Math.round(clamp(Number(decay) * decayScale, 0, 0.85) * 100) / 100))
            .join('|'),
        }
      : undefined

  const doubling = voiceFx
    ? clamp(
        Math.max(numeric(overrides.doubling) ?? 0, character.doubling ?? 0),
        0,
        0.5
      )
    : 0

  const introSfx: SfxChoice = isJingleSfxId(overrides.introSfx)
    ? overrides.introSfx
    : overrides.introSfx === 'none'
      ? 'none'
      : base.introSfx
  const impactSfx: SfxChoice = isJingleSfxId(overrides.impactSfx)
    ? overrides.impactSfx
    : overrides.impactSfx === 'none'
      ? 'none'
      : base.impactSfx
  const transitionSfx: SfxChoice = isJingleSfxId(overrides.transitionSfx)
    ? overrides.transitionSfx
    : overrides.transitionSfx === 'none'
      ? 'none'
      : base.transitionSfx
  const outroSfx: SfxChoice = isJingleSfxId(overrides.outroSfx)
    ? overrides.outroSfx
    : overrides.outroSfx === 'none'
      ? 'none'
      : base.outroSfx

  return {
    ...base,
    style: id,
    intensity: clamped,
    voiceFx,
    bedLevel: Math.round(base.bedLevel * (1.08 - (clamped / 100) * 0.28) * 1000) / 1000,
    introLevel: Math.round(base.introLevel * 1000) / 1000,
    tailLevel: Math.round(base.tailLevel * 1000) / 1000,
    riserLevel: scale(base.riserLevel),
    musicCarveDb: scale(base.musicCarveDb),
    duckRatio: Math.round(base.duckRatio * (0.85 + (clamped / 100) * 0.35) * 10) / 10,
    presenceDb,
    airShelfDb,
    warmShelfDb,
    exciterAmount,
    grit: voiceFx && (base.grit || character.grit)
      ? Math.min(0.45, scale(Math.max(base.grit ?? 0, character.grit ?? 0)))
      : 0,
    echo,
    pitchFactor,
    durationFactor,
    doubling,
    introSfx,
    impactSfx,
    transitionSfx,
    outroSfx,
    riserSeconds:
      introSfx === 'none'
        ? 0
        : base.riserSeconds > 0
          ? Math.min(base.riserSeconds, Math.max(0.25, SFX_DURATION_SECONDS[introSfx]))
          : Math.max(0.25, SFX_DURATION_SECONDS[introSfx]),
    impactLevel: impactSfx === 'none' ? 0 : scaledImpact(base, factor),
    highPassHz: voiceFx ? (character.highPassHz ?? base.highPassHz) : 90,
    lowPassHz: voiceFx ? (character.lowPassHz ?? base.lowPassHz) : undefined,
  } as ResolvedJingleFx
}

function scaledImpact(base: StyleConfig, factor: number): number {
  return Math.round(base.impactLevel * factor * 1000) / 1000
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
      parts.push(`atempo=${fixed(clamp(tempo, 0.5, 2))}`)
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
  if (fx.voiceFx && fx.doubling > 0) {
    parts.push(`aecho=1:0.45:18:${fixed(fx.doubling)}`)
  }
  if (fx.voiceFx && fx.echo) {
    parts.push(
      `aecho=${fixed(fx.echo.inGain)}:${fixed(fx.echo.outGain)}:${fx.echo.delays}:${fx.echo.decays}`
    )
  }
  return parts.join(',')
}

export interface JingleSfxInputs {
  /** Etiqueta de entrada FFmpeg para el SFX de entrada, por ejemplo "2:a". */
  intro?: string
  /** Etiqueta de entrada FFmpeg para el impacto, por ejemplo "3:a". */
  impact?: string
  /** Etiqueta de entrada FFmpeg para el cierre, por ejemplo "4:a". */
  outro?: string
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

  if (fx.riserSeconds > 0 && fx.introSfx !== 'none') {
    const fadeOutIntro = Math.max(0.05, fx.riserSeconds - 0.18)
    if (sfx.intro) {
      const level = SFX_VOLUME[fx.introSfx]
      branches.push(
        `[${sfx.intro}]atrim=start=0:duration=${fixed(fx.riserSeconds)},asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,volume=${fixed(level)},afade=t=out:st=${fixed(fadeOutIntro)}:d=0.18[riser]`
      )
    } else {
      // Fallback sintético si la librería de SFX no está disponible.
      const riser = `aevalsrc=exprs='0.3*sin(2*PI*(150*t+700*t*t))*(0.4+0.6*t)+0.14*sin(2*PI*(153*t+712*t*t))+0.1*(random(0)-0.5)*(1-exp(-8*t))':d=${fixed(fx.riserSeconds)}:s=44100`
      branches.push(
        `${riser},aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.06,afade=t=out:st=${fixed(fadeOutIntro)}:d=0.15,volume=${fixed(fx.riserLevel)}[riser]`
      )
    }
    mixInputs.push('[riser]')
  }

  if (fx.impactLevel > 0 && fx.impactSfx !== 'none') {
    const impactDelay = Math.max(0, voiceDelayMs - 40)
    if (sfx.impact) {
      const level = SFX_VOLUME[fx.impactSfx]
      branches.push(
        `[${sfx.impact}]atrim=start=0:duration=1.2,asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,afade=t=out:st=0.8:d=0.35,adelay=${impactDelay}|${impactDelay},volume=${fixed(level)}[impact]`
      )
    } else {
      const impact = `aevalsrc=exprs='0.8*sin(2*PI*${Math.round(fx.impactFrequency)}*t)*exp(-9*t)+0.2*sin(2*PI*${Math.round(fx.impactFrequency * 2)}*t)*exp(-14*t)':d=0.8:s=44100`
      branches.push(
        `${impact},aformat=channel_layouts=stereo,afade=t=out:st=0.55:d=0.25,adelay=${impactDelay}|${impactDelay},volume=${fixed(fx.impactLevel)}[impact]`
      )
    }
    mixInputs.push('[impact]')
  }

  if (fx.outroSfx !== 'none' && sfx.outro) {
    const outroStart = Math.max(0, total - 1.4)
    const level = SFX_VOLUME[fx.outroSfx]
    branches.push(
      `[${sfx.outro}]atrim=start=0:duration=2,asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,volume=${fixed(level)},afade=t=out:st=1.2:d=0.6,adelay=${Math.round(outroStart * 1000)}|${Math.round(outroStart * 1000)}[outro]`
    )
    mixInputs.push('[outro]')
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
  overrides?: JingleOverrides
}): Promise<MixJingleResult> {
  const fx = resolveJingleFx(
    options.style,
    options.intensity,
    options.voiceFx !== false,
    options.overrides
  )
  const voiceDuration = await probeAudioBufferDuration(options.voice)
  const structure = planJingleStructure({
    requestedDuration: options.requestedDuration,
    voiceDurationSeconds: voiceDuration,
    fx,
    musicStartSeconds: options.musicStartSeconds,
    voiceStartSeconds: options.voiceStartSeconds,
  })

  const sfxDir = path.join(process.cwd(), 'public', 'audio', 'jingle-fx')
  const readSfx = (id: SfxChoice) =>
    id === 'none' ? Promise.resolve(null) : fs.readFile(path.join(sfxDir, sfxFile(id))).catch(() => null)

  const [introAsset, impactAsset, outroAsset] = await Promise.all([
    fx.riserSeconds > 0 ? readSfx(fx.introSfx) : Promise.resolve(null),
    fx.impactLevel > 0 ? readSfx(fx.impactSfx) : Promise.resolve(null),
    readSfx(fx.outroSfx),
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
    const addInput = async (name: string, asset: Buffer | null) => {
      if (!asset) return
      const assetPath = path.join(dir, `${name}.mp3`)
      await fs.writeFile(assetPath, asset)
      extraInputs.push(assetPath)
      return `${nextIndex++}:a`
    }
    sfxInputs.intro = await addInput('intro', introAsset)
    sfxInputs.impact = await addInput('impact', impactAsset)
    sfxInputs.outro = await addInput('outro', outroAsset)

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
