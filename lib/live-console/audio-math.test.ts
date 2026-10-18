import { describe, expect, it } from 'vitest'
import {
  clamp,
  computeRms,
  dbToGain,
  equalPowerGains,
  formatTime,
  gainToDb,
  isAudioFile,
  loopSecondsFromBpm,
  parseTrackName,
  quantizeToBeat,
  rmsToDb,
} from './audio-math'

describe('audio-math', () => {
  it('clamp respeta los límites', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(2, 0, 1)).toBe(1)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })

  it('equal power mantiene ganancia constante y extremos limpios', () => {
    const left = equalPowerGains(0)
    const right = equalPowerGains(1)
    const middle = equalPowerGains(0.5)
    expect(left.a).toBeCloseTo(1)
    expect(left.b).toBeCloseTo(0)
    expect(right.a).toBeCloseTo(0)
    expect(right.b).toBeCloseTo(1)
    expect(middle.a ** 2 + middle.b ** 2).toBeCloseTo(1)
  })

  it('convierte dB a gain y viceversa', () => {
    expect(dbToGain(0)).toBe(1)
    expect(gainToDb(1)).toBe(0)
    expect(dbToGain(-6)).toBeCloseTo(0.501, 2)
    expect(gainToDb(dbToGain(-12))).toBeCloseTo(-12, 4)
  })

  it('calcula RMS y su dB', () => {
    expect(computeRms(new Float32Array([0, 0, 0]))).toBe(0)
    expect(computeRms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1)
    expect(rmsToDb(1)).toBe(0)
    expect(rmsToDb(0)).toBe(-Infinity)
  })

  it('formatea tiempos', () => {
    expect(formatTime(null)).toBe('--:--')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(3661)).toBe('1:01:01')
  })

  it('deriva artista y título del nombre', () => {
    expect(parseTrackName('Daft Punk - One More Time.mp3')).toEqual({
      artist: 'Daft Punk',
      title: 'One More Time',
    })
    expect(parseTrackName('tema_sin_artista.wav')).toEqual({
      artist: null,
      title: 'tema sin artista',
    })
  })

  it('calcula loops por BPM y cuantiza', () => {
    expect(loopSecondsFromBpm(120, 4)).toBe(2)
    expect(loopSecondsFromBpm(0, 4)).toBe(0)
    expect(quantizeToBeat(0.51, 120)).toBeCloseTo(0.5, 5)
    expect(quantizeToBeat(0.51, null)).toBe(0.51)
  })

  it('detecta archivos de audio por nombre o mime', () => {
    expect(isAudioFile('a.mp3')).toBe(true)
    expect(isAudioFile('a.flac')).toBe(true)
    expect(isAudioFile('a.txt')).toBe(false)
    expect(isAudioFile('a.bin', 'audio/ogg')).toBe(true)
  })
})
