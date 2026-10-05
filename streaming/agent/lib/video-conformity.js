// =====================================================
// Conformidad del canónico de video de TV
// =====================================================
// Utilidades compartidas para verificar que un video cumple el canónico
// estricto (resolución, fps, SAR, códec, pixfmt, audio y keyframes regulares).

import { execCmd, ENCODER_CONTAINER, isCanonical, probeVideo } from './video-encoder.js'

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
 * Verifica la conformidad estricta de un archivo: metadatos del canónico +
 * intervalo de keyframes. Retorna { ok, meta, kfMax, reason }.
 */
export async function checkConformity(filepath) {
  const meta = await probeVideo(filepath)

  // Si los metadatos ya fallan, no hace falta escanear keyframes (evita decodificar).
  if (!isCanonical(meta)) {
    return {
      ok: false,
      meta,
      kfMax: null,
      reason: `metadatos: ${meta.width}x${meta.height} ${meta.codec}/${meta.pixFmt} ${meta.fps} sar=${meta.sar} audio=${meta.audioCodec}/${meta.audioSampleRate}/${meta.audioChannels}`,
    }
  }

  const kfMax = await maxKeyframeInterval(filepath)
  if (kfMax > MAX_KEYFRAME_INTERVAL) {
    return { ok: false, meta, kfMax, reason: `keyframe cada ${kfMax.toFixed(2)}s > ${MAX_KEYFRAME_INTERVAL}s` }
  }
  return { ok: true, meta, kfMax, reason: null }
}
