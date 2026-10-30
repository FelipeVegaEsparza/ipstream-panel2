// =====================================================
// Post-proceso de locuciones del agente
// =====================================================
// Normaliza el TTS automático (hora/clima) con una ganancia estática medida
// por loudnorm. No usamos AGC dinámico para evitar que el volumen suba y baje
// dentro de la misma locución.

import { execFile } from 'child_process'
import { promisify } from 'util'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { logger } from './logger.js'

const execFileAsync = promisify(execFile)
const TARGET_LUFS = -16
const MAX_GAIN_DB = 12

function parseInputLufs(stderr) {
  const matches = String(stderr).match(/\{[\s\S]*?\}/g)
  if (!matches) return null
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(matches[i])
      const value = Number(data.input_i)
      if (Number.isFinite(value)) return value
    } catch {}
  }
  return null
}

export async function normalizeSpeechBuffer(buffer, logPrefix = 'ai-announcer') {
  const dir = await mkdtemp(path.join(tmpdir(), 'agent-tts-'))
  const input = path.join(dir, 'raw.mp3')
  const output = path.join(dir, 'normalized.mp3')
  try {
    await writeFile(input, buffer)
    const { stderr } = await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-i', input,
        '-af', `loudnorm=I=${TARGET_LUFS}:TP=-1.5:LRA=11:print_format=json`,
        '-f', 'null',
        '-',
      ],
      { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 }
    )
    const inputLufs = parseInputLufs(stderr)
    if (inputLufs === null) return buffer

    const gain = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, TARGET_LUFS - inputLufs))
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i', input,
        '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.95`,
        '-ar', '44100',
        '-ac', '2',
        '-b:a', '192k',
        output,
      ],
      { timeout: 60_000 }
    )
    return await readFile(output)
  } catch (err) {
    logger.warn({ err: err.message, logPrefix }, 'No se pudo normalizar la locución; se usa el audio raw')
    return buffer
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
