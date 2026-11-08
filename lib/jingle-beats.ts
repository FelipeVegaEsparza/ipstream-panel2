// Alineación al pulso de la música del jingle.
// Decodifica los primeros segundos a PCM mono y detecta el tempo y el
// primer golpe fuerte, sin dependencias externas.

import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface BeatAnalysis {
  beatSeconds: number
  startSeconds: number
  confidence: number
}

const FRAME = 1024
const HOP = 512
const MIN_BEAT = 0.3
const MAX_BEAT = 1.2

export function detectBeatsFromSamples(
  samples: Int16Array,
  sampleRate: number
): BeatAnalysis | null {
  const frames = Math.floor((samples.length - FRAME) / HOP)
  if (frames < 12) return null

  const energy = new Float32Array(frames)
  for (let i = 0; i < frames; i += 1) {
    const offset = i * HOP
    let sum = 0
    for (let j = 0; j < FRAME; j += 1) {
      const value = samples[offset + j] / 32768
      sum += value * value
    }
    energy[i] = Math.sqrt(sum / FRAME)
  }

  const onset = new Float32Array(frames)
  onset[0] = energy[0]
  for (let i = 1; i < frames; i += 1) {
    onset[i] = Math.max(0, energy[i] - energy[i - 1])
  }

  // Suavizado corto para evitar picos aislados de un solo frame.
  const smoothed = new Float32Array(frames)
  for (let i = 0; i < frames; i += 1) {
    const prev = i > 0 ? onset[i - 1] : 0
    const next = i + 1 < frames ? onset[i + 1] : 0
    smoothed[i] = (prev + onset[i] * 2 + next) / 4
  }

  let maxOnset = 0
  let energySum = 0
  for (let i = 0; i < frames; i += 1) {
    if (smoothed[i] > maxOnset) maxOnset = smoothed[i]
    energySum += smoothed[i] * smoothed[i]
  }
  if (maxOnset < 1e-6 || energySum < 1e-9) return null

  const frameRate = sampleRate / HOP
  const minLag = Math.max(2, Math.round(MIN_BEAT * frameRate))
  const maxLag = Math.min(frames - 2, Math.round(MAX_BEAT * frameRate))
  let bestLag = 0
  let bestScore = 0

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    for (let i = lag; i < frames; i += 1) {
      correlation += smoothed[i] * smoothed[i - lag]
    }
    const score = correlation / energySum
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }

  if (bestLag === 0 || bestScore < 0.12) return null

  // Interpolación parabólica para afinar el período.
  let refinedLag = bestLag
  if (bestLag > minLag && bestLag < maxLag) {
    const scoreAt = (lag: number) => {
      let correlation = 0
      for (let i = lag; i < frames; i += 1) {
        correlation += smoothed[i] * smoothed[i - lag]
      }
      return correlation / energySum
    }
    const before = scoreAt(bestLag - 1)
    const at = bestScore
    const after = scoreAt(bestLag + 1)
    const denom = before - 2 * at + after
    if (Math.abs(denom) > 1e-9) {
      refinedLag = bestLag + (0.5 * (before - after)) / denom
    }
  }

  const beatSeconds = Math.min(MAX_BEAT, Math.max(MIN_BEAT, refinedLag / frameRate))

  // Primer golpe fuerte: ahí arranca la música para que el pulso quede en 0.
  const startLimit = Math.min(frames, Math.round(1.6 * frameRate))
  const threshold = maxOnset * 0.35
  let startFrame = 0
  for (let i = 0; i < startLimit; i += 1) {
    if (smoothed[i] >= threshold) {
      startFrame = i
      break
    }
  }

  return {
    beatSeconds: Math.round(beatSeconds * 1000) / 1000,
    startSeconds: Math.round(((startFrame * HOP) / sampleRate) * 1000) / 1000,
    confidence: Math.round(Math.min(1, bestScore) * 100) / 100,
  }
}

export function alignVoiceToBeat(
  defaultStartSeconds: number,
  analysis: BeatAnalysis | null
): number {
  if (!analysis) return defaultStartSeconds
  const beats = Math.ceil(defaultStartSeconds / analysis.beatSeconds - 1e-6)
  const candidate = beats * analysis.beatSeconds
  return candidate - defaultStartSeconds <= 0.45
    ? Math.round(candidate * 1000) / 1000
    : defaultStartSeconds
}

export async function analyzeMusicBeats(music: Buffer): Promise<BeatAnalysis | null> {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'jingle-beats-'))
  const filePath = path.join(dir, 'music.mp3')
  try {
    await fs.writeFile(filePath, music)
    const { stdout } = await execFileAsync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        filePath,
        '-t',
        '12',
        '-ac',
        '1',
        '-ar',
        '22050',
        '-f',
        's16le',
        'pipe:1',
      ],
      { timeout: 30_000, maxBuffer: 32 * 1024 * 1024, encoding: 'buffer' }
    )
    const buffer = stdout as unknown as Buffer
    if (!buffer || buffer.length < 4096) return null
    const copy = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )
    const samples = new Int16Array(copy, 0, Math.floor(buffer.byteLength / 2))
    return detectBeatsFromSamples(samples, 22050)
  } catch {
    return null
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
