import { describe, expect, it } from 'vitest'
import { detectBpm } from './bpm'

function clickTrack(bpm: number, seconds = 12, sampleRate = 44100): Float32Array {
  const length = Math.floor(seconds * sampleRate)
  const data = new Float32Array(length)
  const interval = Math.floor((60 / bpm) * sampleRate)
  for (let start = 0; start < length; start += interval) {
    for (let i = 0; i < 120 && start + i < length; i++) {
      data[start + i] = Math.sin((i / 120) * Math.PI) * 0.9
    }
  }
  return data
}

describe('detectBpm', () => {
  it('detecta un click track a 120 BPM', () => {
    const result = detectBpm(clickTrack(120), 44100)
    expect(result).not.toBeNull()
    expect(result!.bpm).toBeGreaterThan(116)
    expect(result!.bpm).toBeLessThan(124)
    expect(result!.confidence).toBeGreaterThan(0.12)
  })

  it('detecta un click track a 100 BPM', () => {
    const result = detectBpm(clickTrack(100), 44100)
    expect(result).not.toBeNull()
    expect(result!.bpm).toBeGreaterThan(96)
    expect(result!.bpm).toBeLessThan(104)
  })

  it('devuelve null con silencio', () => {
    expect(detectBpm(new Float32Array(44100 * 4), 44100)).toBeNull()
  })

  it('devuelve null con datos inválidos', () => {
    expect(detectBpm(new Float32Array(0), 44100)).toBeNull()
    expect(detectBpm(new Float32Array(1000), 0)).toBeNull()
  })
})
