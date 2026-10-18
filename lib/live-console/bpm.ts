// =====================================================
// Live Console — estimación de BPM
// =====================================================
// Estimador liviano por autocorrelación del envelope de onset.
// No pretende ser un detector de producción: si la confianza es baja,
// la consola simplemente no ofrece loops cuantizados.

import { clamp } from './audio-math'

export interface BpmResult {
  bpm: number
  confidence: number
}

const TARGET_RATE = 11025
const FRAME_SIZE = 1024
const HOP = 256
const MIN_BPM = 60
const MAX_BPM = 180
const ANALYSIS_SECONDS = 60

export function detectBpm(mono: Float32Array, sampleRate: number): BpmResult | null {
  if (!mono.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return null

  const factor = Math.max(1, Math.round(sampleRate / TARGET_RATE))
  const rate = sampleRate / factor
  const maxSamples = Math.min(mono.length, Math.floor(ANALYSIS_SECONDS * sampleRate))
  const length = Math.floor(maxSamples / factor)

  if (length < rate) return null

  const down = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    let sum = 0
    const base = i * factor
    for (let j = 0; j < factor; j++) sum += mono[base + j] || 0
    down[i] = sum / factor
  }

  const fps = rate / HOP
  const frameCount = Math.floor((down.length - FRAME_SIZE) / HOP)
  if (frameCount < 16) return null

  const energy = new Float32Array(frameCount)
  for (let f = 0; f < frameCount; f++) {
    let sum = 0
    const base = f * HOP
    for (let i = 0; i < FRAME_SIZE; i++) {
      const s = down[base + i]
      sum += s * s
    }
    energy[f] = Math.sqrt(sum / FRAME_SIZE)
  }

  let meanEnergy = 0
  for (let i = 0; i < frameCount; i++) meanEnergy += energy[i]
  meanEnergy /= frameCount
  if (meanEnergy <= 1e-8) return null

  const onset = new Float32Array(frameCount)
  let onsetMean = 0
  for (let i = 1; i < frameCount; i++) {
    const diff = energy[i] - energy[i - 1]
    onset[i] = diff > 0 ? diff : 0
    onsetMean += onset[i]
  }
  onsetMean /= frameCount
  if (onsetMean <= 1e-9) return null

  for (let i = 0; i < frameCount; i++) onset[i] /= onsetMean

  const minLag = Math.max(2, Math.floor((fps * 60) / MAX_BPM))
  const maxLag = Math.min(frameCount - 2, Math.ceil((fps * 60) / MIN_BPM))
  if (maxLag <= minLag) return null

  let bestLag = minLag
  let bestScore = -Infinity
  let scoreSum = 0
  let scoreCount = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = lag; i < frameCount; i++) corr += onset[i] * onset[i - lag]
    corr /= frameCount - lag
    scoreSum += corr
    scoreCount++
    if (corr > bestScore) {
      bestScore = corr
      bestLag = lag
    }
  }

  if (!Number.isFinite(bestScore) || bestScore <= 0) return null

  const avg = scoreCount > 0 ? scoreSum / scoreCount : 0
  const confidence = clamp((bestScore - avg) / (bestScore + 1e-9), 0, 1)
  if (confidence < 0.12) return null

  let bpm = (fps * 60) / bestLag
  while (bpm < 80) bpm *= 2
  while (bpm > 180) bpm /= 2

  return { bpm: Math.round(bpm * 10) / 10, confidence: Math.round(confidence * 100) / 100 }
}
