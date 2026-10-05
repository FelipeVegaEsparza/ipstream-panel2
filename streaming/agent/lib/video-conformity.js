// =====================================================
// Conformidad y procesamiento de video de TV
// =====================================================
// Decide cómo llevar un archivo a un estado reproducible por el AutoDJ:
//  - Si el video YA es compatible y el audio también → sin cambios.
//  - Si el video es compatible pero el audio no → remux de audio (barato).
//  - Si el video no es compatible (códec/pixfmt/SAR/resolución o keyframes
//    irregulares) → re-encode (sin upscale) con keyframes cada 2s.

import {
  execCmd,
  ENCODER_CONTAINER,
  probeVideo,
  normalizeVideo,
  remuxAudio,
  VIDEO_MAX_WIDTH,
  VIDEO_MAX_HEIGHT,
  AUDIO_SAMPLE_RATE,
  AUDIO_CHANNELS,
} from './video-encoder.js'

const VIDEO_DIR = '/var/lib/video'

// Intervalo máximo de keyframe tolerado (2s objetivo + margen).
const MAX_KEYFRAME_INTERVAL = 2.5

/**
 * Devuelve el intervalo máximo entre keyframes (en segundos). Infinity si hay
 * menos de 2 keyframes. Solo decodifica los keyframes (rápido).
 */
export async function maxKeyframeInterval(filepath) {
  const out = await execCmd(
    `docker exec ${ENCODER_CONTAINER} ffprobe -v error -select_streams v:0 -skip_frame nokey ` +
    `-show_entries frame=pts_time -of csv=p=0 '${VIDEO_DIR}/${filepath}'`,
    { timeout: 0 }
  )
  const times = String(out)
    .split('\n')
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !Number.isNaN(n))
  if (times.length < 2) return Infinity
  let max = 0
  for (let i = 1; i < times.length; i++) max = Math.max(max, times[i] - times[i - 1])
  return max
}

/**
 * El video se puede copiar (sin re-encode) si es H.264 yuv420p, SAR 1:1 y no
 * supera 1920×1080. La resolución nativa se mantiene (no se upscalea).
 */
export function isVideoCompatible(meta) {
  const sarOk = meta.sar === null || meta.sar === '1:1' || meta.sar === '1/1'
  return meta.codec === 'h264' &&
    meta.pixFmt === 'yuv420p' &&
    sarOk &&
    (meta.width || 0) > 0 && (meta.height || 0) > 0 &&
    meta.width <= VIDEO_MAX_WIDTH &&
    meta.height <= VIDEO_MAX_HEIGHT
}

/** El audio es compatible si ya es AAC estéreo 44.1 kHz. */
export function isAudioCompatible(meta) {
  return meta.audioCodec === 'aac' &&
    meta.audioSampleRate === AUDIO_SAMPLE_RATE &&
    meta.audioChannels === AUDIO_CHANNELS
}

/**
 * Verifica el archivo y devuelve { videoOk, audioOk, kfMax, meta, reason }.
 * `videoOk` incluye los keyframes (si están muy espaciados, no sirve copy).
 */
export async function checkConformity(filepath) {
  const meta = await probeVideo(filepath)

  if (!isVideoCompatible(meta)) {
    return {
      videoOk: false,
      audioOk: false,
      meta,
      kfMax: null,
      reason: `video: ${meta.width}x${meta.height} ${meta.codec}/${meta.pixFmt} sar=${meta.sar}`,
    }
  }

  const kfMax = await maxKeyframeInterval(filepath)
  if (kfMax > MAX_KEYFRAME_INTERVAL) {
    return { videoOk: false, audioOk: false, meta, kfMax, reason: `keyframe cada ${kfMax.toFixed(2)}s > ${MAX_KEYFRAME_INTERVAL}s` }
  }

  const audioOk = isAudioCompatible(meta)
  return {
    videoOk: true,
    audioOk,
    meta,
    kfMax,
    reason: audioOk ? null : `audio: ${meta.audioCodec}/${meta.audioSampleRate}/${meta.audioChannels}`,
  }
}

/**
 * Procesa un archivo según su conformidad y devuelve { changed, meta }.
 */
export async function processVideoFile(clientId, filepath) {
  const conf = await checkConformity(filepath)
  if (conf.videoOk && conf.audioOk) return { changed: false, meta: conf.meta }
  if (conf.videoOk) return { changed: true, meta: await remuxAudio(clientId, filepath) }
  return { changed: true, meta: await normalizeVideo(clientId, filepath) }
}
