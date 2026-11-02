// =====================================================
// Loudness estático por track (ReplayGain)
// =====================================================
// Mide LUFS-I con ffmpeg y escribe replaygain_track_gain / track_peak sin
// re-encodear el audio. Liquidsoap los consume con normalize_track_gain.

import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import { parseFile } from 'music-metadata'
import { logger } from './logger.js'

const run = promisify(execFile)

export const LOUDNESS_TARGET_LUFS = -16
export const LOUDNESS_MAX_GAIN_DB = 12

function parseLoudnormJson(stderr) {
  const matches = String(stderr).match(/\{[\s\S]*?\}/g)
  if (!matches) return null
  for (let i = matches.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(matches[i])
      const inputI = Number(data.input_i)
      const inputTp = Number(data.input_tp)
      if (Number.isFinite(inputI)) {
        return {
          inputLufs: inputI,
          inputTp: Number.isFinite(inputTp) ? inputTp : null,
        }
      }
    } catch {}
  }
  return null
}

export async function hasReplayGain(filePath) {
  try {
    const meta = await parseFile(filePath, { duration: false, skipCovers: true })
    return Number.isFinite(meta.common.replaygain_track_gain?.dB)
  } catch {
    return false
  }
}

export async function measureLoudness(filePath) {
  const { stderr } = await run(
    'ffmpeg',
    [
      '-hide_banner',
      '-i', filePath,
      '-af', `loudnorm=I=${LOUDNESS_TARGET_LUFS}:TP=-1.5:LRA=11:print_format=json`,
      '-f', 'null',
      '-',
    ],
    { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 }
  )
  return parseLoudnormJson(stderr)
}

/**
 * Mide y etiqueta un MP3. No re-encodea audio: usa -c copy y reemplaza el
 * archivo solo si ffmpeg termina bien.
 */
export async function tagLoudness(filePath, { force = false } = {}) {
  if (!force && await hasReplayGain(filePath)) {
    return { tagged: false, reason: 'already_tagged' }
  }
  const measured = await measureLoudness(filePath)
  if (!measured) return { tagged: false, reason: 'measure_failed' }

  const gainDb = Math.max(
    -LOUDNESS_MAX_GAIN_DB,
    Math.min(LOUDNESS_MAX_GAIN_DB, LOUDNESS_TARGET_LUFS - measured.inputLufs)
  )
  const peak = measured.inputTp === null ? null : Math.pow(10, measured.inputTp / 20)
  const tempPath = `${filePath}.loudness-${process.pid}.tmp.mp3`
  const metadata = [
    '-metadata', `replaygain_track_gain=${gainDb.toFixed(2)} dB`,
    ...(peak === null ? [] : ['-metadata', `replaygain_track_peak=${peak.toFixed(4)}`]),
  ]

  try {
    await run(
      'ffmpeg',
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', filePath, '-map', '0', '-c', 'copy', ...metadata, tempPath],
      { timeout: 120_000 }
    )
    await fs.rename(tempPath, filePath)
    return { tagged: true, gainDb, peak }
  } catch (err) {
    await fs.unlink(tempPath).catch(() => {})
    logger.warn({ err: err.message, filePath }, 'No se pudo etiquetar loudness')
    return { tagged: false, reason: 'tag_failed' }
  }
}
