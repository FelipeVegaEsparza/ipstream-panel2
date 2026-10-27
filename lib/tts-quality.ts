export const TTS_QUALITY_PRESETS = [
  {
    id: 'natural',
    label: 'Natural',
    description: 'Claridad y naturalidad para locución diaria.',
    stability: 0.45,
    similarityBoost: 0.8,
    style: 0.15,
    useSpeakerBoost: true,
    speed: 1,
  },
  {
    id: 'stable',
    label: 'Estable',
    description: 'Más firme y parejo para avisos e informes.',
    stability: 0.65,
    similarityBoost: 0.8,
    style: 0,
    useSpeakerBoost: true,
    speed: 1,
  },
  {
    id: 'expressive',
    label: 'Expresiva',
    description: 'Más energía y matices para promos y presentaciones.',
    stability: 0.35,
    similarityBoost: 0.8,
    style: 0.45,
    useSpeakerBoost: true,
    speed: 0.98,
  },
] as const

export type TtsQualityPresetId = (typeof TTS_QUALITY_PRESETS)[number]['id']
export const DEFAULT_TTS_QUALITY_PRESET: TtsQualityPresetId = 'natural'

export interface ResolvedTtsQuality {
  presetId: TtsQualityPresetId
  stability: number
  similarityBoost: number
  style: number
  useSpeakerBoost: boolean
  speed: number
}

export function isTtsQualityPresetId(value: unknown): value is TtsQualityPresetId {
  return typeof value === 'string' && TTS_QUALITY_PRESETS.some((preset) => preset.id === value)
}

export function getTtsQualityPreset(value: string | null | undefined) {
  return (
    TTS_QUALITY_PRESETS.find((preset) => preset.id === value) ??
    TTS_QUALITY_PRESETS.find((preset) => preset.id === DEFAULT_TTS_QUALITY_PRESET)!
  )
}

export function resolveTtsQuality(input: {
  globalPreset?: string | null
  clientPreset?: string | null
  clientStyle?: number | null
}): ResolvedTtsQuality {
  const preset = getTtsQualityPreset(input.clientPreset || input.globalPreset)
  const explicitStyle = Number(input.clientStyle ?? 0)
  const style =
    Number.isFinite(explicitStyle) && explicitStyle > 0
      ? Math.max(0, Math.min(1, explicitStyle / 100))
      : preset.style

  return {
    presetId: preset.id,
    stability: preset.stability,
    similarityBoost: preset.similarityBoost,
    style,
    useSpeakerBoost: preset.useSpeakerBoost,
    speed: preset.speed,
  }
}

export function ttsQualityCacheToken(quality: ResolvedTtsQuality): string {
  return [
    quality.presetId,
    quality.stability.toFixed(3),
    quality.similarityBoost.toFixed(3),
    quality.style.toFixed(3),
    quality.useSpeakerBoost ? '1' : '0',
    quality.speed.toFixed(3),
  ].join(':')
}
