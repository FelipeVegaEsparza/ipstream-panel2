import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TTS_QUALITY_PRESET,
  resolveTtsQuality,
  ttsQualityCacheToken,
} from './tts-quality'

describe('tts quality presets', () => {
  it('usa natural por defecto', () => {
    const quality = resolveTtsQuality({})
    expect(quality.presetId).toBe(DEFAULT_TTS_QUALITY_PRESET)
    expect(quality.stability).toBe(0.45)
    expect(quality.style).toBe(0.15)
    expect(quality.speed).toBe(1)
  })

  it('el preset del cliente gana sobre el global', () => {
    const quality = resolveTtsQuality({
      globalPreset: 'stable',
      clientPreset: 'expressive',
    })
    expect(quality.presetId).toBe('expressive')
    expect(quality.style).toBe(0.45)
  })

  it('un aiVoiceStyle explícito gana sobre el style del preset', () => {
    const quality = resolveTtsQuality({
      globalPreset: 'natural',
      clientStyle: 70,
    })
    expect(quality.style).toBe(0.7)
    expect(quality.stability).toBe(0.45)
  })

  it('un estilo 0 usa el style del preset', () => {
    const quality = resolveTtsQuality({
      globalPreset: 'expressive',
      clientStyle: 0,
    })
    expect(quality.style).toBe(0.45)
  })

  it('la clave de cache cambia con el preset', () => {
    const natural = ttsQualityCacheToken(resolveTtsQuality({ globalPreset: 'natural' }))
    const stable = ttsQualityCacheToken(resolveTtsQuality({ globalPreset: 'stable' }))
    expect(natural).not.toBe(stable)
  })
})
