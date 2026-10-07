// =====================================================
// Video Packager (VOD2Live)
// =====================================================
// Empaqueta un video a HLS en un LADDER ABR (varias rendiciones, configurable
// por TV_VIDEO_LADDER) bajo hls/<clientId>/<trackId>/<rendition>/. Cada
// rendición es H.264/yuv420p a 30fps, keyframes cada 2s y bitrate capado, con
// los segmentos ALINEADOS entre rendiciones (mismo número/orden) para que el
// stitcher los mapee por índice. Si una rendición coincide con la fuente y ésta
// ya es compatible, se segmenta por copy (CPU≈0).
// El resultado se consume con el channel-stitcher para armar el canal vivo.

import {
  execCmd,
  ENCODER_CONTAINER,
  probeVideo,
} from './video-encoder.js'
import { config } from './config.js'

const VIDEO_DIR = '/var/lib/video'
const MAX_KEYFRAME_INTERVAL = 2.5
const PACKAGE_SECONDS = 2
const GOP = 60
const CANONICAL_FPS = 30

function fpsNumber(fps) {
  if (!fps) return null
  const [n, d] = String(fps).split('/').map(Number)
  if (!d) return null
  return n / d
}

function even(n) {
  const v = Math.max(2, Math.trunc(n || 0))
  return v - (v % 2)
}

async function maxKeyframeInterval(filepath) {
  const out = await execCmd(
    `docker exec ${ENCODER_CONTAINER} ffprobe -v error -select_streams v:0 -skip_frame nokey ` +
    `-show_entries frame=pts_time -of csv=p=0 '${VIDEO_DIR}/${filepath}'`,
    { timeout: 0 }
  )
  const times = String(out).split('\n').map((s) => parseFloat(s.trim())).filter((n) => !Number.isNaN(n))
  if (times.length < 2) return Infinity
  let max = 0
  for (let i = 1; i < times.length; i++) max = Math.max(max, times[i] - times[i - 1])
  return max
}

/**
 * Empaqueta `filepath` a HLS en un ladder bajo hls/<clientId>/<trackId>/<rend>/.
 * Devuelve { hlsPath, renditions } — hlsPath es el directorio del track y
 * renditions es la lista de variantes generadas.
 */
export async function packageVideo(clientId, trackId, filepath) {
  const src = `${VIDEO_DIR}/${filepath}`
  const relDir = `hls/${clientId}/${trackId}`
  const absDir = `${VIDEO_DIR}/${relDir}`
  await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p '${absDir}'`)

  const meta = await probeVideo(filepath)
  const h264 = meta.codec === 'h264' && meta.pixFmt === 'yuv420p'
  const sarOk = meta.sar === null || meta.sar === '1:1' || meta.sar === '1/1'
  const fps = fpsNumber(meta.fps)
  const fpsOk = fps !== null && Math.abs(fps - CANONICAL_FPS) < 0.1
  const hasAudio = !!meta.audioCodec
  const srcW = meta.width || 0
  const srcH = meta.height || 0

  // Rendiciones del ladder que no superen la altura de la fuente (sin upscale).
  let ladder = config.video.ladder.filter((r) => srcH >= r.height)
  if (ladder.length === 0) {
    // Fuente menor que toda rendición: una única rendición nativa.
    const smallest = config.video.ladder[config.video.ladder.length - 1] || { bitrateKbps: 1500 }
    ladder = [{ name: 'native', bitrateKbps: smallest.bitrateKbps, width: even(srcW), height: even(srcH) }]
  }

  // Fast-path: sólo posible si la fuente ya es h264/yuv420p/sar/fps ok y sus
  // keyframes son regulares (se verifica una sola vez para todas las rendiciones).
  let kfOk = false
  if (h264 && sarOk && fpsOk) {
    const kf = await maxKeyframeInterval(filepath)
    kfOk = kf <= MAX_KEYFRAME_INTERVAL
  }

  const renditions = []
  for (const r of ladder) {
    const rDir = `${absDir}/${r.name}`
    const outPlaylist = `${rDir}/index.m3u8`
    await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p '${rDir}'`)

    const segArgs = `-f hls -hls_time ${PACKAGE_SECONDS} -hls_playlist_type vod ` +
      `-hls_flags independent_segments -hls_segment_type mpegts ` +
      `-hls_segment_filename '${rDir}/seg_%05d.ts'`
    const acodec = `-c:a aac -b:a 128k -ar 44100 -ac 2`

    // Copy sólo si la fuente coincide EXACTAMENTE con la rendición y su bitrate
    // cabe en el tope de esa rendición (si no, heredaría un bitrate alto).
    const resMatch = srcW === r.width && srcH === r.height
    const rMaxBits = Math.round(r.bitrateKbps * 1.15) * 1000
    const bitrateOk = !meta.bitRate || meta.bitRate <= rMaxBits
    const canCopy = h264 && sarOk && fpsOk && kfOk && resMatch && bitrateOk

    let cmd
    if (canCopy) {
      if (hasAudio) {
        cmd = `ffmpeg -y -i '${src}' -c:v copy ${acodec} ${segArgs} '${outPlaylist}'`
      } else {
        cmd = `ffmpeg -y -i '${src}' -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v:0 -map 1:a:0 ` +
          `-c:v copy ${acodec} -shortest ${segArgs} '${outPlaylist}'`
      }
    } else {
      const vf = `scale=${r.width}:${r.height}:force_original_aspect_ratio=decrease,` +
        `pad=${r.width}:${r.height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${CANONICAL_FPS}`
      const vcodec = `-c:v libx264 -preset ${config.video.preset} -threads ${config.video.threads} ` +
        `-g ${GOP} -keyint_min ${GOP} -sc_threshold 0 ` +
        `-b:v ${r.bitrateKbps}k -maxrate ${Math.round(r.bitrateKbps * 1.15)}k -bufsize ${Math.round(r.bitrateKbps * 2)}k ` +
        `-profile:v main -level:v 4.0 -pix_fmt yuv420p -fps_mode cfr`
      if (hasAudio) {
        cmd = `ffmpeg -y -i '${src}' -vf '${vf}' ${vcodec} ${acodec} ${segArgs} '${outPlaylist}'`
      } else {
        cmd = `ffmpeg -y -i '${src}' -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v:0 -map 1:a:0 ` +
          `-vf '${vf}' ${vcodec} ${acodec} -shortest ${segArgs} '${outPlaylist}'`
      }
    }

    await execCmd(`docker exec ${ENCODER_CONTAINER} sh -c "${cmd}"`, { timeout: 0 })
    renditions.push({ name: r.name, width: r.width, height: r.height, bitrateKbps: r.bitrateKbps })
  }

  return { hlsPath: relDir, renditions }
}
