// =====================================================
// Video Packager (VOD2Live)
// =====================================================
// Empaqueta un video a HLS (segmentos MPEG-TS + playlist VOD) a resolución
// NATIVA, sin upscale. Si el archivo ya es H.264/yuv420p con keyframes
// regulares, se segmenta por copy (CPU≈0). Si no, se transcode una vez.
// El resultado se consume con el channel-stitcher para armar el canal vivo.

import {
  execCmd,
  ENCODER_CONTAINER,
  probeVideo,
} from './video-encoder.js'

const VIDEO_DIR = '/var/lib/video'
const MAX_KEYFRAME_INTERVAL = 2.5
const PACKAGE_SECONDS = 2
const GOP = 60

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
 * Empaqueta `filepath` a HLS bajo hls/<clientId>/<trackId>/.
 * Devuelve { hlsPath, playlistRel } (paths relativos dentro del volumen).
 */
export async function packageVideo(clientId, trackId, filepath) {
  const src = `${VIDEO_DIR}/${filepath}`
  const relDir = `hls/${clientId}/${trackId}`
  const absDir = `${VIDEO_DIR}/${relDir}`
  const outPlaylist = `${absDir}/index.m3u8`

  await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p '${absDir}'`)

  const meta = await probeVideo(filepath)
  const h264 = meta.codec === 'h264' && meta.pixFmt === 'yuv420p'
  const sarOk = meta.sar === null || meta.sar === '1:1' || meta.sar === '1/1'
  let kfOk = false
  if (h264 && sarOk) {
    const kf = await maxKeyframeInterval(filepath)
    kfOk = kf <= MAX_KEYFRAME_INTERVAL
  }
  const hasAudio = !!meta.audioCodec

  const segArgs = `-f hls -hls_time ${PACKAGE_SECONDS} -hls_playlist_type vod ` +
    `-hls_flags independent_segments -hls_segment_type mpegts ` +
    `-hls_segment_filename '${absDir}/seg_%05d.ts'`

  let cmd
  if (h264 && sarOk && kfOk) {
    // Segmentar sin re-encode (copy video). Audio se normaliza a AAC 44.1k.
    if (hasAudio) {
      cmd = `ffmpeg -y -i '${src}' -c:v copy -c:a aac -b:a 128k -ar 44100 -ac 2 ${segArgs} '${outPlaylist}'`
    } else {
      cmd = `ffmpeg -y -i '${src}' -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v:0 -map 1:a:0 ` +
        `-c:v copy -c:a aac -b:a 128k -ar 44100 -ac 2 -shortest ${segArgs} '${outPlaylist}'`
    }
  } else {
    // Transcode una vez a resolución NATIVA (sin upscale), 30fps, keyframes 2s.
    const evenScale = `scale=trunc(iw/2)*2:trunc(ih/2)*2`
    const needsDown = (meta.width || 0) > 1920 || (meta.height || 0) > 1080
    const vf = needsDown
      ? `scale=1920:1080:force_original_aspect_ratio=decrease,${evenScale},fps=30`
      : `${evenScale},fps=30`
    const vcodec = `-c:v libx264 -preset ultrafast -threads 0 -g ${GOP} -keyint_min ${GOP} -sc_threshold 0 -pix_fmt yuv420p -fps_mode cfr`
    const acodec = `-c:a aac -b:a 128k -ar 44100 -ac 2`
    if (hasAudio) {
      cmd = `ffmpeg -y -i '${src}' -vf '${vf}' ${vcodec} ${acodec} ${segArgs} '${outPlaylist}'`
    } else {
      cmd = `ffmpeg -y -i '${src}' -f lavfi -i anullsrc=r=44100:cl=stereo -map 0:v:0 -map 1:a:0 ` +
        `-vf '${vf}' ${vcodec} ${acodec} -shortest ${segArgs} '${outPlaylist}'`
    }
  }

  await execCmd(`docker exec ${ENCODER_CONTAINER} sh -c "${cmd}"`, { timeout: 0 })

  return { hlsPath: relDir, playlistRel: `${relDir}/index.m3u8` }
}
