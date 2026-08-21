// =====================================================
// IPStream Video Encoder Controller
// =====================================================
// Análogo a liquidsoap.js — controla FFmpeg por cliente
// via docker exec desde este contenedor hacia video-encoder.
//
// Flujo:
//   1. agent hace docker exec para escribir playlist.txt
//   2. agent hace docker exec ffmpeg -f concat -i playlist.txt rtmp://srs/live/{streamKey}
//   3. DJ conecta a SRS -> on-publish hook -> agent para FFmpeg
//   4. DJ desconecta -> on-unpublish hook -> agent reanuda FFmpeg

import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pool } from './db.js'

export const ENCODER_CONTAINER = 'ipstream-video-encoder'
const VIDEO_DIR = '/var/lib/video'
const PLAYLIST_DIR = '/var/lib/video/playlists'
const PROCESS_LOG_DIR = '/var/log/video-encoder'

// Los stream keys se mapean: clientId -> { streamKey, ffmpegProcess, startedAt }
const _activeEncoders = new Map()

export function execCmd(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { ...opts, timeout: 30000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

// =====================================================
// Playlist management
// =====================================================

export function getPlaylistPath(clientId) {
  return path.join(PLAYLIST_DIR, `${clientId}.txt`)
}

/**
 * Genera un archivo playlist.txt con la lista de videos a reproducir.
 * Formato: file '/var/lib/video/{filepath}'
 * El orden y shuffle se maneja desde el playlist M3U-like.
 */
export async function generatePlaylist(clientId, entries) {
  const content = entries
    .map(e => `file '${VIDEO_DIR}/${e.filepath}'`)
    .join('\n')

  // Escribir dentro del contenedor video-encoder
  // Primero aseguramos que el dir exista
  await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p ${PLAYLIST_DIR}`)

  // Escribir el playlist
  const tmpFile = `/tmp/playlist_${clientId}.txt`
  fs.writeFileSync(tmpFile, content)
  await execCmd(`docker cp ${tmpFile} ${ENCODER_CONTAINER}:${getPlaylistPath(clientId)}`)
  fs.unlinkSync(tmpFile)

  return getPlaylistPath(clientId)
}

// =====================================================
// FFmpeg process control
// =====================================================

/**
 * Inicia el AutoDJ de video para un cliente.
 * FFmpeg lee playlist.txt y envía a RTMP SRS.
 */
export async function startEncoder(clientId, videoStreamKey) {
  if (_activeEncoders.has(clientId)) {
    const existing = _activeEncoders.get(clientId)
    if (existing.status === 'running') {
      return { status: 'already_running', startedAt: existing.startedAt }
    }
    _activeEncoders.delete(clientId)
  }

  const playlistPath = getPlaylistPath(clientId)
  const rtmpUrl = `rtmp://srs:1935/live/${videoStreamKey}`
  const logFile = `${PROCESS_LOG_DIR}/${clientId}.log`

  // Matar procesos FFmpeg previos para este cliente
  await killAllFfmpegForClient(clientId)

  // Ciclo de reproducción: cuando termina, vuelve a empezar
  // FFmpeg con stream_loop -1 para loop infinito
  // Las paths ya están sanitizadas (sin espacios), no requieren quoting
  const shScript = `mkdir -p ${PROCESS_LOG_DIR} && nohup ffmpeg -loglevel error -stats -re -f concat -safe 0 -stream_loop -1 -i ${playlistPath} -c:v libx264 -preset veryfast -b:v 2000k -maxrate 2500k -bufsize 4000k -c:a aac -b:a 128k -ar 44100 -ac 2 -f flv ${rtmpUrl} >${logFile} 2>&1 &`
  const cmd = `docker exec ${ENCODER_CONTAINER} sh -c '${shScript}'`

  try {
    await execCmd(cmd)

    _activeEncoders.set(clientId, {
      pid: `ffmpeg_${clientId}`,
      streamKey: videoStreamKey,
      status: 'running',
      startedAt: new Date().toISOString(),
      currentTrack: null,
    })

    return { status: 'started', startedAt: _activeEncoders.get(clientId).startedAt }
  } catch (err) {
    console.error(`[video-encoder] Error starting FFmpeg for ${clientId}:`, err.message)
    return { status: 'error', error: err.message }
  }
}

/**
 * Detiene el AutoDJ de video para un cliente.
 */
export async function stopEncoder(clientId) {
  const encoder = _activeEncoders.get(clientId)
  if (!encoder || encoder.status !== 'running') {
    // Fallback: kill all ffmpeg for this client
    await killAllFfmpegForClient(clientId)
    return { status: 'stopped' }
  }

  try {
    // Docker kill del proceso FFmpeg específico
    // Como lanzamos con -d, el pid devuelto es del contenedor
    // Mejor: buscar y matar el proceso ffmpeg dentro del contenedor
    await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -f "concat.*${clientId}" || true`)
    await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -f "playlists/${clientId}" || true`)

    _activeEncoders.delete(clientId)
    return { status: 'stopped' }
  } catch (err) {
    console.error(`[video-encoder] Error stopping FFmpeg for ${clientId}:`, err.message)
    // Force kill
    await killAllFfmpegForClient(clientId)
    _activeEncoders.delete(clientId)
    return { status: 'stopped', warning: err.message }
  }
}

async function killAllFfmpegForClient(clientId) {
  try {
    await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -f "playlists/${clientId}" || true`)
    await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -f "video/playlists" || true`)
  } catch (_) { }
}

/**
 * Retorna el estado actual del encoder para un cliente.
 */
export function getEncoderStatus(clientId) {
  const encoder = _activeEncoders.get(clientId)
  if (!encoder) return { status: 'off', startedAt: null, currentTrack: null }
  return { status: encoder.status, startedAt: encoder.startedAt, currentTrack: encoder.currentTrack }
}

/**
 * Retorna el estado de todos los encoders activos.
 */
export function getAllEncoders() {
  const result = {}
  for (const [clientId, enc] of _activeEncoders) {
    result[clientId] = {
      status: enc.status,
      startedAt: enc.startedAt,
      currentTrack: enc.currentTrack,
      streamKey: enc.streamKey,
    }
  }
  return result
}

export function isRunning(clientId) {
  const enc = _activeEncoders.get(clientId)
  return enc && enc.status === 'running'
}

// =====================================================
// Transcoder FFmpeg — recibe del app 'relay' de SRS, reencoda a H.264 y
// re-publica en el app 'dj' de SRS
// Compatible con OBS enhanced RTMP y cualquier codec (H.264, H.265)
// =====================================================
//
// El DJ publica a SRS en el app 'relay' junto a su stream key. SRS valida la
// key vía el hook on_publish (deniega keys desconocidas). Cuando la key es
// válida, el agent arranca un transcoder FFmpeg que jala
// rtmp://srs:1935/relay/<streamKey>, reencoda a H.264/AAC y publica en
// rtmp://srs:1935/dj/<streamKey> — el flujo 'dj' ya existente (AutoDJ stop,
// status live, HLS) se dispara solo.
//
// Nota: no hace falta un listener FFmpeg con puerto propio por cliente; SRS
// ya escucha en 1935 y valida la key. Esto elimina el rango de puertos
// relay (1936-2235) expuesto públicamente.

const RELAY_PUBLIC_HOST = process.env.RTMP_RELAY_PUBLIC_HOST || 'localhost'

/**
 * URL de ingesta de la Conexión Universal. El DJ publica aquí con su stream
 * key; SRS valida la key y el agent arranca el transcoder hacia 'dj'.
 */
export function getRelayIngestUrl() {
  return `rtmp://${RELAY_PUBLIC_HOST}:1935/relay`
}

// clientId -> { streamKey, startedAt }
const _activeTranscoders = new Map()

/**
 * Inicia un transcoder FFmpeg para un cliente.
 * Jala el stream publicado en SRS (app 'relay') y lo re-publica en 'dj'.
 *
 * Un solo proceso ffmpeg por conexión (sin loop de respawn): un loop que
 * reintente en idle publica vacío en 'dj' y llena el HLS de segmentos rotos
 * y discontinuidades que el player no puede reproducir (pantalla negra).
 * Si ffmpeg muere, la reconexión del DJ vuelve a llamar startTranscoder y
 * reinicia desde cero.
 */
export async function startTranscoder(clientId, streamKey) {
  // Matar procesos previos/stale del mismo cliente antes de arrancar.
  // Los procesos ffmpeg viven en el contenedor video-encoder y sobreviven
  // a reinicios del agent (estado en memoria): sin este cleanup, un
  // transcoder viejo seguiría jalando/publicando y peleando con el nuevo.
  try {
    await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -9 -f "transcoder_${clientId}" || true`)
  } catch (_) { }

  const logFile = `${PROCESS_LOG_DIR}/transcoder_${clientId}.log`
  const shScript =
    `mkdir -p ${PROCESS_LOG_DIR} && ` +
    `ffmpeg -loglevel error -stats ` +
    // rw_timeout: si el DJ se desconecta, ffmpeg no queda colgado esperando
    // datos (RTMP sin publisher) y termina solo pasados 5s.
    // genpts+discardcorrupt: estabiliza timestamps del pull de SRS; sin esto
    // el re-encode sale con dts erráticos y SRS escribe fragmentos HLS que el
    // player no puede decodificar (pantalla negra).
    `-rw_timeout 5000000 -fflags +genpts+discardcorrupt ` +
    `-i rtmp://srs:1935/relay/${streamKey} ` +
    `-c:v libx264 -preset veryfast -b:v 2000k -maxrate 2500k -bufsize 4000k ` +
    // pix_fmt yuv420p obligatorio: si el input llega 4:4:4 (RGB), libx264
    // puede emitir High 4:4:4 Predictive, que Chrome/Firefox NO decodifican
    // (pantalla negra en el player).
    `-pix_fmt yuv420p ` +
    `-c:a aac -b:a 128k -ar 44100 -ac 2 ` +
    // use_wallclock_as_timestamps + no_duration_filesize: timestamps
    // monotónicos y FLV limpio para el muxer HLS de SRS.
    `-use_wallclock_as_timestamps 1 -flvflags no_duration_filesize ` +
    `-f flv rtmp://srs:1935/dj/${streamKey} ` +
    `>>${logFile} 2>&1 &`
  const cmd = `docker exec ${ENCODER_CONTAINER} sh -c '${shScript}'`

  try {
    await execCmd(cmd)
    _activeTranscoders.set(clientId, { streamKey, startedAt: new Date().toISOString() })
    console.log(`[video-encoder] Transcoder started for ${clientId} -> ${streamKey}`)
    return { status: 'started', startedAt: _activeTranscoders.get(clientId).startedAt }
  } catch (err) {
    console.error(`[video-encoder] Error starting transcoder for ${clientId}:`, err.message)
    return { status: 'error', error: err.message }
  }
}

export async function stopTranscoder(clientId) {
  const transcoder = _activeTranscoders.get(clientId)
  if (transcoder) {
    try {
      // -9: ffmpeg puede estar bloqueado en un recv() de RTMP sin datos y no
      // procesa SIGTERM; SIGKILL lo mata siempre.
      await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -9 -f "transcoder_${clientId}" || true`)
    } catch (_) {}
    _activeTranscoders.delete(clientId)
  }
  return { status: 'stopped' }
}

/**
 * Retorna el estado del transcoder para un cliente.
 */
export function getTranscoderStatus(clientId) {
  const t = _activeTranscoders.get(clientId)
  return t ? { active: true, startedAt: t.startedAt } : { active: false }
}

// =====================================================
// Extract thumbnail de video
// =====================================================

/**
 * Extrae un thumbnail de un video (frame en el segundo 5).
 * Retorna el nombre del archivo thumbnail o null si falla.
 */
export async function extractThumbnail(clientId, filepath) {
  const inputPath = path.join(VIDEO_DIR, filepath)
  const thumbnailFilename = path.basename(filepath, path.extname(filepath)) + '.jpg'
  const thumbnailDir = path.join(VIDEO_DIR, 'thumbnails', clientId)
  const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)

  try {
    await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p '${thumbnailDir}'`)

    await execCmd(`docker exec ${ENCODER_CONTAINER} ffmpeg -y -i '${inputPath}' -ss 00:00:05 -vframes 1 -q:v 2 '${thumbnailPath}'`)
    // Retornar ruta relativa
    return `/var/lib/video/thumbnails/${clientId}/${thumbnailFilename}`
  } catch (err) {
    console.error(`[video-encoder] Error extracting thumbnail for ${filepath}:`, err.message)
    return null
  }
}

// =====================================================
// Auto-arranque al deploy
// =====================================================

/**
 * Reinicia todos los streams de video con autoStart=1.
 * Análogo a autoStartStreams de liquidsoap.js.
 */
export async function autoStartVideoStreams() {
  console.log('[video-encoder] Auto-starting video streams...')

  // Limpiar transcodificadores stale de ejecuciones previas: el estado en
  // memoria (_activeTranscoders) se pierde al reiniciar el agent, pero los
  // procesos ffmpeg del contenedor video-encoder sobreviven. Un transcoder
  // huérfano seguiría jalando/publicando en 'dj' y peleando con el AutoDJ.
  try {
    await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -9 -f "transcoder_" || true`)
  } catch (_) { }

  const [rows] = await pool.query(
    `SELECT vs.clientId, c.name as clientName FROM video_streams vs
     JOIN clients c ON c.id = vs.clientId
     WHERE vs.autoStart = true`
  )

  const videoStreams = rows || []

  for (const vs of videoStreams) {
    const key = `tv_${crypto.createHash('sha256').update(vs.clientId).digest('hex').slice(0, 12)}`

    // Generar playlist con entries existentes
    const [entries] = await pool.query(
      `SELECT vt.filepath FROM video_playlist_entries vpe
       JOIN video_tracks vt ON vt.id = vpe.trackId
       WHERE vpe.clientId = ? ORDER BY vpe.position ASC`,
      [vs.clientId]
    )

    if (!entries || entries.length === 0) {
      console.log(`[video-encoder] No entries for ${vs.clientName || vs.clientId}, skipping auto-start`)
      continue
    }

    await generatePlaylist(vs.clientId, entries.map(e => ({ filepath: e.filepath })))

    const existing = _activeEncoders.get(vs.clientId)
    if (existing && existing.status === 'running') {
      console.log(`[video-encoder] Restarting video stream for ${vs.clientName || vs.clientId}...`)
      await stopEncoder(vs.clientId)
    }

    await startEncoder(vs.clientId, key)

    console.log(`[video-encoder] Started video stream for ${vs.clientName || vs.clientId}`)
  }

  console.log(`[video-encoder] Auto-started ${videoStreams.length} video streams`)
}
