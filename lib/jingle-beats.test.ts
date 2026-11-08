import { describe, expect, it } from 'vitest'
import { alignVoiceToBeat, detectBeatsFromSamples } from './jingle-beats'

function clickTrack(options: {
  sampleRate?: number
  seconds?: number
  bpm?: number
  offset?: number
}): Int16Array {
  const sampleRate = options.sampleRate ?? 22050
  const seconds = options.seconds ?? 4
  const bpm = options.bpm ?? 120
  const offset = options.offset ?? 0
  const samples = new Int16Array(Math.floor(sampleRate * seconds))
  const interval = 60 / bpm
  for (let time = offset; time < seconds; time += interval) {
    const start = Math.floor(time * sampleRate)
    for (let j = 0; j < 400 && start + j < samples.length; j += 1) {
      samples[start + j] = Math.round(28000 * Math.exp(-j / 45))
    }
  }
  return samples
}

describe('detectBeatsFromSamples', () => {
  it('detecta un pulso de 120 BPM', () => {
    const analysis = detectBeatsFromSamples(clickTrack({ bpm: 120 }), 22050)
    expect(analysis).not.toBeNull()
    expect(analysis!.beatSeconds).toBeGreaterThan(0.46)
    expect(analysis!.beatSeconds).toBeLessThan(0.54)
    expect(analysis!.startSeconds).toBeLessThan(0.1)
  })

  it('detecta un pulso de 100 BPM', () => {
    const analysis = detectBeatsFromSamples(clickTrack({ bpm: 100 }), 22050)
    expect(analysis).not.toBeNull()
    expect(analysis!.beatSeconds).toBeGreaterThan(0.56)
    expect(analysis!.beatSeconds).toBeLessThan(0.64)
  })

  it('devuelve null con silencio', () => {
    expect(detectBeatsFromSamples(new Int16Array(22050 * 2), 22050)).toBeNull()
  })
})

describe('alignVoiceToBeat', () => {
  it('redondea la entrada al siguiente pulso cercano', () => {
    const aligned = alignVoiceToBeat(1.1, { beatSeconds: 0.5, startSeconds: 0, confidence: 0.5 })
    expect(aligned).toBe(1.5)
  })

  it('no mueve la voz si el siguiente pulso queda lejos', () => {
    const aligned = alignVoiceToBeat(1.1, { beatSeconds: 1.1, startSeconds: 0, confidence: 0.5 })
    expect(aligned).toBe(1.1)
  })

  it('sin análisis mantiene el inicio original', () => {
    expect(alignVoiceToBeat(1.1, null)).toBe(1.1)
  })
})
