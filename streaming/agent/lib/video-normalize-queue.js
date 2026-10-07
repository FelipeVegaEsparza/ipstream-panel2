// =====================================================
// Cola de normalización de video (TV)
// =====================================================
// Procesa en background la normalización + thumbnail de los videos subidos,
// con concurrencia 1 por nodo (ffmpeg re-encode es CPU-intensivo).
// Estados del track: pending -> processing -> ready | error.

import fs from 'fs'
import path from 'path'
import { pool } from './db.js'
import { logger } from './logger.js'
import { normalizeVideo, extractThumbnail, probeVideo } from './video-encoder.js'
import { checkConformity } from './video-conformity.js'
import { packageVideo } from './video-packager.js'
import { config } from './config.js'

const _queue = []
let _running = false

// Debe coincidir con el canónico de video-encoder.js.
const VIDEO_MAX_WIDTH = 1920
const VIDEO_MAX_HEIGHT = 1080

// Tamaño en bytes de un directorio (recursivo), para registrar el peso real
// del HLS en vez del archivo fuente (que se elimina tras empaquetar).
function dirSizeBytes(absDir) {
  let total = 0
  try {
    for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
      const p = path.join(absDir, e.name)
      if (e.isFile()) total += fs.statSync(p).size
      else if (e.isDirectory()) total += dirSizeBytes(p)
    }
  } catch (_) {}
  return total
}

// Elimina el archivo fuente original una vez empaquetado a HLS. El playout de
// VOD2Live solo consume el HLS, así que no hace falta conservar el original.
async function removeSourceFile(filepath) {
  const abs = path.join('/var/lib/video', filepath)
  try {
    await fs.promises.unlink(abs)
    logger.info({ filepath }, 'Original eliminado tras empaquetar (VOD2Live)')
  } catch (err) {
    logger.warn({ err: err.message, filepath }, 'No se pudo eliminar el original tras empaquetar')
  }
}

export function enqueueVideoNormalization(job) {
  _queue.push(job)
  logger.info({ trackId: job.trackId, clientId: job.clientId }, 'Normalización de video encolada')
  if (!_running) _run()
}

async function _run() {
  if (_running) return
  _running = true
  try {
    while (_queue.length > 0) {
      const job = _queue.shift()
      try {
        await _process(job)
      } catch (err) {
        logger.error({ err: err.message, trackId: job.trackId }, 'Error inesperado en job de normalización')
      }
    }
  } finally {
    _running = false
  }
}

async function _process(job) {
  const { trackId, clientId, filepath } = job

  await pool.query(
    `UPDATE video_tracks SET status = 'processing', processingError = NULL WHERE id = ?`,
    [trackId]
  )

  try {
    // Modo VOD2Live: empaquetar a HLS (ladder ABR) en vez de uniformar a 1080p.
    if (config.video.playout === 'stitch') {
      const { hlsPath, renditions } = await packageVideo(clientId, trackId, filepath)
      const thumbnail = await extractThumbnail(clientId, filepath)
      const m = await probeVideo(filepath)
      // Peso real en disco = HLS completo (todas las rendiciones); el fuente se
      // borra abajo, así la cuota refleja lo que realmente ocupa el cliente.
      const filesize = dirSizeBytes(path.join('/var/lib/video', hlsPath))
      await pool.query(
        `UPDATE video_tracks
         SET status = 'ready', processingError = NULL, hlsPath = ?, renditions = ?, filesize = ?, duration = ?,
             width = ?, height = ?, codec = ?, thumbnail = ?
         WHERE id = ?`,
        [hlsPath, JSON.stringify(renditions || []), filesize, m.duration ?? 0, m.width ?? null, m.height ?? null, m.codec ?? null, thumbnail ?? null, trackId]
      )
      await removeSourceFile(filepath)
      logger.info({ trackId, clientId, hlsPath, renditions }, 'Video empaquetado (VOD2Live ABR)')
      return
    }

    // Fast-path: si el archivo ya cumple el canónico estricto (resolución, fps,
    // SAR, códec, audio y keyframes regulares), NO se re-encodea. Así las
    // re-subidas y los videos ya compatibles quedan listos al instante.
    const conf = await checkConformity(filepath)
    if (conf.ok) {
      const thumbnail = await extractThumbnail(clientId, filepath)
      const m = conf.meta
      let filesize = 0
      try { filesize = fs.statSync(path.join('/var/lib/video', filepath)).size } catch (_) {}
      await pool.query(
        `UPDATE video_tracks
         SET status = 'ready', processingError = NULL, filesize = ?, duration = ?,
             width = ?, height = ?, codec = ?, thumbnail = ?
         WHERE id = ?`,
        [
          filesize,
          m.duration ?? 0,
          m.width ?? null,
          m.height ?? null,
          m.codec ?? null,
          thumbnail ?? null,
          trackId,
        ]
      )
      logger.info({ trackId, clientId }, 'Video ya canónico: sin re-encode')
      return
    }

    logger.info({ trackId, clientId, reason: conf.reason }, 'Normalizando video (re-encode)')
    const normalized = await normalizeVideo(clientId, filepath)
    const thumbnail = await extractThumbnail(clientId, filepath)

    await pool.query(
      `UPDATE video_tracks
       SET status = 'ready', processingError = NULL, filesize = ?, duration = ?,
           width = ?, height = ?, codec = ?, thumbnail = ?
       WHERE id = ?`,
      [
        normalized.filesize ?? 0,
        normalized.duration ?? 0,
        normalized.width ?? null,
        normalized.height ?? null,
        normalized.codec ?? null,
        thumbnail ?? null,
        trackId,
      ]
    )
    logger.info({ trackId, clientId }, 'Normalización de video lista')
  } catch (err) {
    const message = String(err.message || err).slice(0, 1000)
    await pool.query(
      `UPDATE video_tracks SET status = 'error', processingError = ? WHERE id = ?`,
      [message, trackId]
    )
    logger.warn({ trackId, clientId, err: message }, 'Normalización de video falló')
  }
}

/**
 * Excluye del aire (marca `pending`) y re-encola los tracks `ready` que no
 * cumplen el canónico estricto por sus metadatos (resolución/códec). Se llama
 * antes de resolver la playlist de emisión para sanear catálogo legado.
 */
export async function requeueNonConformantTracks(clientId) {
  const [rows] = await pool.query(
    `SELECT id, filepath FROM video_tracks
     WHERE clientId = ? AND status = 'ready'
       AND (codec IS NULL OR codec <> 'h264' OR width IS NULL OR height IS NULL
            OR width <> ? OR height <> ?)`,
    [clientId, VIDEO_MAX_WIDTH, VIDEO_MAX_HEIGHT]
  )
  for (const row of rows || []) {
    await pool.query(
      `UPDATE video_tracks SET status = 'pending', processingError = NULL WHERE id = ?`,
      [row.id]
    )
    enqueueVideoNormalization({ trackId: row.id, clientId, filepath: row.filepath })
  }
  if (rows && rows.length > 0) {
    logger.info({ clientId, count: rows.length }, 'Reencolando tracks no conformes')
  }
  return rows?.length || 0
}

/**
 * Reencola tracks que quedaron en 'pending' o 'processing' por un reinicio del
 * agente a mitad de la normalización, para que no queden colgados.
 */
export async function recoverVideoNormalizations() {
  try {
    const [rows] = await pool.query(
      `SELECT id, clientId, filepath FROM video_tracks WHERE status IN ('pending', 'processing')`
    )
    for (const row of rows || []) {
      _queue.push({ trackId: row.id, clientId: row.clientId, filepath: row.filepath })
    }
    if (rows && rows.length > 0) {
      logger.info({ count: rows.length }, 'Reencolando normalizaciones pendientes')
      if (!_running) _run()
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'No se pudieron recuperar normalizaciones pendientes')
  }
}
