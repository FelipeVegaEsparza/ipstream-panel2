// =====================================================
// Routes — Video Playlist Schedule (parrilla horaria TV)
// =====================================================

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { generatePlaylist, startEncoder, stopEncoder } from '../lib/video-encoder.js'
import { isTimeInSlot } from '../lib/time.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

function getStreamKey(clientId) {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

export default async function videoScheduleRoutes(app) {
  /**
   * GET /api/video/:clientId/schedule
   * Lista todas las franjas programadas del cliente de video.
   */
  app.get('/api/video/:clientId/schedule', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(
      `SELECT vps.id, vps.dayOfWeek, vps.startTime, vps.endTime, vps.isActive,
              vps.playlistId, vps.videoStreamId,
              vp.name AS playlistName,
              (SELECT COUNT(*) FROM video_playlist_entries vpe WHERE vpe.playlistId = vp.id) AS playlistTrackCount
       FROM video_playlist_schedules vps
       JOIN video_playlists vp ON vp.id = vps.playlistId
       WHERE vps.clientId = ?
       ORDER BY vps.dayOfWeek ASC, vps.startTime ASC`,
      [clientId]
    )
    return { count: rows.length, schedules: rows }
  })

  /**
   * POST /api/video/:clientId/schedule
   * Crea una nueva franja horaria.
   */
  app.post('/api/video/:clientId/schedule', async (request, reply) => {
    const { clientId } = request.params
    const { playlistId, dayOfWeek, startTime, endTime } = request.body || {}

    if (!playlistId || dayOfWeek === undefined || !startTime || !endTime) {
      return reply.code(400).send({ error: 'faltan_campos', message: 'playlistId, dayOfWeek, startTime y endTime son requeridos' })
    }
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return reply.code(400).send({ error: 'dayOfWeek_invalido', message: 'dayOfWeek debe ser 0-6' })
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return reply.code(400).send({ error: 'hora_invalida', message: 'startTime y endTime deben estar en formato HH:mm' })
    }

    // Verificar que la playlist existe y pertenece al cliente
    const [plRows] = await pool.query(
      'SELECT id FROM video_playlists WHERE id = ? AND clientId = ? LIMIT 1',
      [playlistId, clientId]
    )
    if (plRows.length === 0) {
      return reply.code(404).send({ error: 'playlist_no_encontrada' })
    }

    // Resolver el video_stream del cliente (se crea si no existe)
    const [vsRows] = await pool.query(
      'SELECT id FROM video_streams WHERE clientId = ? LIMIT 1',
      [clientId]
    )
    let videoStreamId = vsRows[0]?.id || null
    if (!videoStreamId) {
      const streamId = uuid()
      await pool.query(
        `INSERT INTO video_streams (id, clientId, status, mode, shuffle, \`repeat\`, autoStart, createdAt, updatedAt)
         VALUES (?, ?, 'off', 'playlist', false, true, true, NOW(), NOW())`,
        [streamId, clientId]
      )
      videoStreamId = streamId
    }

    const id = uuid()
    await pool.query(
      `INSERT INTO video_playlist_schedules (id, clientId, videoStreamId, playlistId, dayOfWeek, startTime, endTime, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [id, clientId, videoStreamId, playlistId, dayOfWeek, startTime, endTime]
    )

    logger.info({ clientId, scheduleId: id, playlistId, dayOfWeek, startTime, endTime }, 'Franja horaria TV creada')
    return { id, playlistId, dayOfWeek, startTime, endTime }
  })

  /**
   * PATCH /api/video/:clientId/schedule/:id
   * Actualiza una franja horaria.
   */
  app.patch('/api/video/:clientId/schedule/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const { playlistId, dayOfWeek, startTime, endTime, isActive } = request.body || {}

    // Verificar que existe
    const [rows] = await pool.query(
      'SELECT id FROM video_playlist_schedules WHERE id = ? AND clientId = ? LIMIT 1',
      [id, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    const fields = []
    const values = []
    if (playlistId !== undefined) {
      const [plRows] = await pool.query(
        'SELECT id FROM video_playlists WHERE id = ? AND clientId = ? LIMIT 1',
        [playlistId, clientId]
      )
      if (plRows.length === 0) return reply.code(404).send({ error: 'playlist_no_encontrada' })
      fields.push('playlistId = ?')
      values.push(playlistId)
    }
    if (dayOfWeek !== undefined) {
      if (dayOfWeek < 0 || dayOfWeek > 6) return reply.code(400).send({ error: 'dayOfWeek_invalido' })
      fields.push('dayOfWeek = ?')
      values.push(dayOfWeek)
    }
    if (startTime !== undefined) {
      fields.push('startTime = ?')
      values.push(startTime)
    }
    if (endTime !== undefined) {
      fields.push('endTime = ?')
      values.push(endTime)
    }
    if (isActive !== undefined) {
      fields.push('isActive = ?')
      values.push(isActive ? 1 : 0)
    }

    if (fields.length === 0) {
      return reply.code(400).send({ error: 'sin_cambios' })
    }

    fields.push('updatedAt = NOW()')
    values.push(id, clientId)

    await pool.query(
      `UPDATE video_playlist_schedules SET ${fields.join(', ')} WHERE id = ? AND clientId = ?`,
      values
    )

    logger.info({ clientId, scheduleId: id, fields: fields.length }, 'Franja horaria TV actualizada')
    return { success: true }
  })

  /**
   * DELETE /api/video/:clientId/schedule/:id
   * Elimina una franja horaria.
   */
  app.delete('/api/video/:clientId/schedule/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const [rows] = await pool.query(
      'SELECT id FROM video_playlist_schedules WHERE id = ? AND clientId = ? LIMIT 1',
      [id, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    await pool.query('DELETE FROM video_playlist_schedules WHERE id = ? AND clientId = ?', [id, clientId])
    logger.info({ clientId, scheduleId: id }, 'Franja horaria TV eliminada')
    return { success: true }
  })

  /**
   * GET /api/video/:clientId/schedule/current
   * Devuelve la playlist que debería estar al aire AHORA según la parrilla,
   * o null si no hay ninguna franja activa para este momento.
   */
  app.get('/api/video/:clientId/schedule/current', async (request, reply) => {
    const { clientId } = request.params

    const [tzRows] = await pool.query(
      'SELECT timezone FROM clients WHERE id = ? LIMIT 1',
      [clientId]
    )
    const timeZone = tzRows[0]?.timezone || 'UTC'

    const [rows] = await pool.query(
      `SELECT vps.id, vps.playlistId, vps.dayOfWeek, vps.startTime, vps.endTime,
              vp.name AS playlistName
       FROM video_playlist_schedules vps
       JOIN video_playlists vp ON vp.id = vps.playlistId
       WHERE vps.clientId = ? AND vps.isActive = 1
       ORDER BY vps.dayOfWeek ASC, vps.startTime ASC`,
      [clientId]
    )

    const now = new Date()
    for (const slot of rows) {
      if (isTimeInSlot(now, slot.dayOfWeek, slot.startTime, slot.endTime, timeZone)) {
        return { current: slot }
      }
    }
    return { current: null }
  })
}

/**
 * Inicia el cron que cada 30s revisa la parrilla de video de TODOS los
 * clientes en AutoDJ y cambia la playlist activa si toca. Como ffmpeg lee
 * playlist.txt al arrancar, aplicar un cambio requiere reiniciar el encoder.
 *
 * Llamar desde server.js tras registrar las rutas.
 */
export function startVideoScheduleCron() {
  logger.info('Iniciando cron de parrilla horaria TV (intervalo: 30s)')

  setInterval(async () => {
    try {
      const [clients] = await pool.query(
        `SELECT clientId FROM video_streams WHERE status = 'autodj'`
      )

      for (const client of clients) {
        try {
          await applyVideoScheduleForClient(client.clientId)
        } catch (err) {
          logger.error({ clientId: client.clientId, err: err.message }, 'Error aplicando schedule TV')
        }
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Error en cron de parrilla TV')
    }
  }, 30000)
}

/**
 * Revisa la parrilla de video de un cliente y si la playlist que toca
 * es distinta a la activa, la activa, regenera el playlist y reinicia el
 * encoder manteniendo el estado 'autodj'.
 */
async function applyVideoScheduleForClient(clientId) {
  const now = new Date()

  const [tzRows] = await pool.query(
    'SELECT timezone FROM clients WHERE id = ? LIMIT 1',
    [clientId]
  )
  const timeZone = tzRows[0]?.timezone || 'UTC'

  // Obtener la franja activa para este momento
  const [schedules] = await pool.query(
    `SELECT vps.playlistId, vps.startTime, vps.endTime, vps.dayOfWeek
     FROM video_playlist_schedules vps
     WHERE vps.clientId = ? AND vps.isActive = 1`,
    [clientId]
  )

  let scheduledPlaylistId = null
  for (const slot of schedules) {
    if (isTimeInSlot(now, slot.dayOfWeek, slot.startTime, slot.endTime, timeZone)) {
      scheduledPlaylistId = slot.playlistId
      break
    }
  }

  // Obtener la playlist actualmente activa
  const [activeRows] = await pool.query(
    'SELECT id FROM video_playlists WHERE clientId = ? AND isActive = 1 LIMIT 1',
    [clientId]
  )
  const currentActiveId = activeRows[0]?.id || null

  if (!scheduledPlaylistId) {
    return
  }

  if (scheduledPlaylistId === currentActiveId) {
    return
  }

  logger.info({
    clientId,
    from: currentActiveId,
    to: scheduledPlaylistId,
  }, 'Cambio de playlist TV por parrilla horaria')

  // Desactivar la playlist anterior y activar la nueva
  await pool.query('UPDATE video_playlists SET isActive = 0 WHERE clientId = ? AND isActive = 1', [clientId])
  await pool.query('UPDATE video_playlists SET isActive = 1 WHERE id = ?', [scheduledPlaylistId])

  // Regenerar el playlist.txt con las entries de la playlist activa y reiniciar el encoder
  const [entries] = await pool.query(
    `SELECT vt.filepath FROM video_playlist_entries vpe
     JOIN video_tracks vt ON vt.id = vpe.trackId
     WHERE vpe.clientId = ? AND vpe.playlistId = ?
     ORDER BY vpe.position ASC`,
    [clientId, scheduledPlaylistId]
  )

  if (!entries || entries.length === 0) {
    logger.warn({ clientId, playlistId: scheduledPlaylistId }, 'Playlist TV activa sin entries, se omite el cambio')
    return
  }

  await generatePlaylist(clientId, entries.map(e => ({ filepath: e.filepath })))

  await stopEncoder(clientId)
  await startEncoder(clientId, getStreamKey(clientId))

  await pool.query(`UPDATE video_streams SET status = 'autodj' WHERE clientId = ?`, [clientId])
}
