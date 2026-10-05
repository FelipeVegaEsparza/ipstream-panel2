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
import { extractThumbnail, VIDEO_MAX_WIDTH, VIDEO_MAX_HEIGHT } from './video-encoder.js'
import { processVideoFile } from './video-conformity.js'

const _queue = []
let _running = false

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
    // Decisión: sin cambios / remux de audio / re-encode (ver video-conformity).
    const { changed, meta } = await processVideoFile(clientId, filepath)
    const thumbnail = await extractThumbnail(clientId, filepath)
    let filesize = 0
    try { filesize = fs.statSync(path.join('/var/lib/video', filepath)).size } catch (_) {}

    await pool.query(
      `UPDATE video_tracks
       SET status = 'ready', processingError = NULL, filesize = ?, duration = ?,
           width = ?, height = ?, codec = ?, thumbnail = ?
       WHERE id = ?`,
      [
        meta.filesize ?? filesize,
        meta.duration ?? 0,
        meta.width ?? null,
        meta.height ?? null,
        meta.codec ?? null,
        thumbnail ?? null,
        trackId,
      ]
    )
    logger.info({ trackId, clientId, changed }, changed ? 'Video procesado' : 'Video ya compatible: sin re-encode')
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
 * Excluye del aire (marca `pending`) y re-encola los tracks `ready` cuyos
 * metadatos no son compatibles (códec no H.264 o resolución mayor a 1080p).
 * Los keyframes no se pueden verificar desde la DB (eso lo hace el job).
 */
export async function requeueNonConformantTracks(clientId) {
  const [rows] = await pool.query(
    `SELECT id, filepath FROM video_tracks
     WHERE clientId = ? AND status = 'ready'
       AND (codec IS NULL OR codec <> 'h264' OR width IS NULL OR height IS NULL
            OR width > ? OR height > ?)`,
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
