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
// Relay FFmpeg — recibe en un puerto único por cliente, reencoda a H.264, envía a SRS
// Compatible con OBS enhanced RTMP y cualquier codec
// =====================================================
//
// Cada cliente con TV necesita su propio puerto relay, porque solo puede
// haber un proceso FFmpeg escuchando en un puerto TCP a la vez.
// Asignamos puertos de un rango configurable (default 1936-2235) basándonos
// en un hash del clientId, evitando colisiones con los puertos ya en uso.
//
// Para producción, hay que publicar el rango en docker-compose:
//   ports: "1936-2235:1936-2235"
// Y configurar RTMP_RELAY_PORT_RANGE_START / _END + RTMP_RELAY_PUBLIC_HOST.

const RELAY_PORT_RANGE_START = parseInt(process.env.RTMP_RELAY_PORT_RANGE_START || '1936', 10)
const RELAY_PORT_RANGE_END = parseInt(process.env.RTMP_RELAY_PORT_RANGE_END || '2235', 10)
const RELAY_PUBLIC_HOST = process.env.RTMP_RELAY_PUBLIC_HOST || 'localhost'

const RELAY_PORT_RANGE_SIZE = RELAY_PORT_RANGE_END - RELAY_PORT_RANGE_START + 1

// clientId -> { streamKey, port, startedAt }
const _activeRelays = new Map()
// Set<number> — puertos ya reservados (incluso si el relay aún no arrancó,
// para evitar que dos clientes peleen por el mismo puerto durante el arranque)
const _usedRelayPorts = new Set()

/**
 * Asigna un puerto único en el rango configurado para el cliente dado.
 * Usa un hash determinístico del clientId como base, y si ese puerto está
 * ocupado, busca el siguiente libre.
 */
export function allocateRelayPort(clientId) {
  // Releer del estado actual para no asignar dos veces el mismo puerto.
  for (const [cid, info] of _activeRelays.entries()) {
    _usedRelayPorts.add(info.port)
  }

  // Hash determinístico
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash + clientId.charCodeAt(i)) | 0
  }
  const base = Math.abs(hash) % RELAY_PORT_RANGE_SIZE

  // Buscar puerto libre empezando por el hash
  for (let i = 0; i < RELAY_PORT_RANGE_SIZE; i++) {
    const candidate = RELAY_PORT_RANGE_START + ((base + i) % RELAY_PORT_RANGE_SIZE)
    if (!_usedRelayPorts.has(candidate)) {
      _usedRelayPorts.add(candidate)
      return candidate
    }
  }

  // Rango agotado
  throw new Error(
    `No hay puertos relay disponibles en el rango ${RELAY_PORT_RANGE_START}-${RELAY_PORT_RANGE_END}`
  )
}

export function getRelayUrl(clientId) {
  const relay = _activeRelays.get(clientId)
  if (!relay) return null
  return `rtmp://${RELAY_PUBLIC_HOST}:${relay.port}/live/relay`
}

export function getRelayPort(clientId) {
  const relay = _activeRelays.get(clientId)
  return relay ? relay.port : null
}

/**
 * Inicia relay FFmpeg para un cliente.
 * Escucha en un puerto único del rango, recibe stream OBS, reencoda a
 * H.264 y envía a SRS.
 */
export async function startRelay(clientId, streamKey) {
  const existing = _activeRelays.get(clientId)
  if (existing) return { status: 'already_running', port: existing.port }

  let port
  try {
    port = allocateRelayPort(clientId)
  } catch (err) {
    return { status: 'error', error: err.message }
  }

  const logFile = `${PROCESS_LOG_DIR}/relay_${clientId}.log`
  const shScript =
    `mkdir -p ${PROCESS_LOG_DIR} && ` +
    `while true; do ` +
    `ffmpeg -loglevel error -stats ` +
    `-listen 1 -timeout 30000000 ` +
    `-i rtmp://0.0.0.0:${port}/live/relay ` +
    `-c:v libx264 -preset veryfast -b:v 2000k -maxrate 2500k -bufsize 4000k ` +
    `-c:a aac -b:a 128k -ar 44100 -ac 2 ` +
    `-f flv rtmp://srs:1935/dj/${streamKey} ` +
    `>>${logFile} 2>&1; sleep 1; ` +
    `done &`
  const cmd = `docker exec ${ENCODER_CONTAINER} sh -c '${shScript}'`

  try {
    await execCmd(cmd)
    _activeRelays.set(clientId, { streamKey, port, startedAt: new Date().toISOString() })
    console.log(`[video-encoder] Relay started for ${clientId} on port ${port} -> ${streamKey}`)
    return { status: 'started', port }
  } catch (err) {
    // Liberar el puerto reservado si falla el arranque
    _usedRelayPorts.delete(port)
    console.error(`[video-encoder] Error starting relay for ${clientId}:`, err.message)
    return { status: 'error', error: err.message }
  }
}

export async function stopRelay(clientId) {
  const relay = _activeRelays.get(clientId)
  if (relay) {
    try {
      await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -f "relay_${clientId}" || true`)
      await execCmd(`docker exec ${ENCODER_CONTAINER} pkill -f "listen 1.*relay" || true`)
    } catch (_) {}
    _usedRelayPorts.delete(relay.port)
    _activeRelays.delete(clientId)
  }
  return { status: 'stopped' }
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

    // Iniciar relay para OBS enhanced RTMP (puerto 1936)
    await startRelay(vs.clientId, key)

    console.log(`[video-encoder] Started video stream for ${vs.clientName || vs.clientId}`)
  }

  console.log(`[video-encoder] Auto-started ${videoStreams.length} video streams`)
}
