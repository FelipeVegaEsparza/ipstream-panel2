// =====================================================
// Routes — Playlist Schedule (parrilla horaria)
// =====================================================

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import { isTimeInSlot, getNextSlots } from '../lib/time.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

export default async function scheduleRoutes(app) {
  /**
   * GET /api/streams/:clientId/schedule
   * Lista todas las franjas programadas del cliente.
   */
  app.get('/api/streams/:clientId/schedule', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(
      `SELECT ps.id, ps.dayOfWeek, ps.startTime, ps.endTime, ps.isActive,
              ps.playlistId, ps.radioStreamId,
              p.name AS playlistName, p.trackCount AS playlistTrackCount
       FROM playlist_schedules ps
       JOIN playlists p ON p.id = ps.playlistId
       WHERE ps.clientId = ?
       ORDER BY ps.dayOfWeek ASC, ps.startTime ASC`,
      [clientId]
    )
    return { count: rows.length, schedules: rows }
  })

  /**
   * POST /api/streams/:clientId/schedule
   * Crea una nueva franja horaria.
   */
  app.post('/api/streams/:clientId/schedule', async (request, reply) => {
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
      'SELECT id, radioStreamId FROM playlists WHERE id = ? AND clientId = ? LIMIT 1',
      [playlistId, clientId]
    )
    if (plRows.length === 0) {
      return reply.code(404).send({ error: 'playlist_no_encontrada' })
    }

    const id = uuid()
    const radioStreamId = plRows[0].radioStreamId
    await pool.query(
      `INSERT INTO playlist_schedules (id, clientId, radioStreamId, playlistId, dayOfWeek, startTime, endTime, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [id, clientId, radioStreamId, playlistId, dayOfWeek, startTime, endTime]
    )

    logger.info({ clientId, scheduleId: id, playlistId, dayOfWeek, startTime, endTime }, 'Franja horaria creada')
    return { id, playlistId, dayOfWeek, startTime, endTime }
  })

  /**
   * PATCH /api/streams/:clientId/schedule/:id
   * Actualiza una franja horaria.
   */
  app.patch('/api/streams/:clientId/schedule/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const { playlistId, dayOfWeek, startTime, endTime, isActive } = request.body || {}

    // Verificar que existe
    const [rows] = await pool.query(
      'SELECT id FROM playlist_schedules WHERE id = ? AND clientId = ? LIMIT 1',
      [id, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    const fields = []
    const values = []
    if (playlistId !== undefined) {
      // Verificar que la playlist existe
      const [plRows] = await pool.query(
        'SELECT id FROM playlists WHERE id = ? AND clientId = ? LIMIT 1',
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
      `UPDATE playlist_schedules SET ${fields.join(', ')} WHERE id = ? AND clientId = ?`,
      values
    )

    logger.info({ clientId, scheduleId: id, fields: fields.length }, 'Franja horaria actualizada')
    return { success: true }
  })

  /**
   * DELETE /api/streams/:clientId/schedule/:id
   * Elimina una franja horaria.
   */
  app.delete('/api/streams/:clientId/schedule/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const [rows] = await pool.query(
      'SELECT id FROM playlist_schedules WHERE id = ? AND clientId = ? LIMIT 1',
      [id, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    await pool.query('DELETE FROM playlist_schedules WHERE id = ? AND clientId = ?', [id, clientId])
    logger.info({ clientId, scheduleId: id }, 'Franja horaria eliminada')
    return { success: true }
  })

  /**
   * GET /api/streams/:clientId/schedule/current
   * Devuelve la playlist que debería sonar AHORA según la parrilla,
   * las siguientes franjas (hasta 3) y la zona horaria del cliente.
   * `current` es null si no hay ninguna franja activa para este momento.
   */
  app.get('/api/streams/:clientId/schedule/current', async (request, reply) => {
    const { clientId } = request.params

    const [tzRows] = await pool.query(
      'SELECT timezone FROM clients WHERE id = ? LIMIT 1',
      [clientId]
    )
    const timeZone = tzRows[0]?.timezone || 'UTC'

    const [rows] = await pool.query(
      `SELECT ps.id, ps.playlistId, ps.dayOfWeek, ps.startTime, ps.endTime,
              p.name AS playlistName
       FROM playlist_schedules ps
       JOIN playlists p ON p.id = ps.playlistId
       WHERE ps.clientId = ? AND ps.isActive = 1
       ORDER BY ps.dayOfWeek ASC, ps.startTime ASC`,
      [clientId]
    )

    const now = new Date()
    let current = null
    for (const slot of rows) {
      if (isTimeInSlot(now, slot.dayOfWeek, slot.startTime, slot.endTime, timeZone)) {
        current = slot
        break
      }
    }
    const upcoming = getNextSlots(
      current ? rows.filter((s) => s.id !== current.id) : rows,
      now,
      timeZone,
      3
    )
    return { current, upcoming, timezone: timeZone }
  })
}

/**
 * Inicia el cron que cada 30s revisa la parrilla de TODOS los clientes
 * y cambia la playlist activa si toca.
 *
 * Llamar desde server.js tras registrar las rutas.
 */
export function startScheduleCron() {
  logger.info('Iniciando cron de parrilla horaria (intervalo: 30s)')

  setInterval(async () => {
    try {
      // Obtener todos los clientes con stream activo
      const [clients] = await pool.query(
        `SELECT rs.clientId, rs.icecastMount
         FROM radio_streams rs
         WHERE rs.liquidsoapRunning = 1 AND rs.enabled = 1`
      )

      for (const client of clients) {
        try {
          await applyScheduleForClient(client.clientId)
        } catch (err) {
          logger.error({ clientId: client.clientId, err: err.message }, 'Error aplicando schedule')
        }
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Error en cron de parrilla')
    }
  }, 30000)
}

/**
 * Revisa la parrilla de un cliente y si la playlist que toca
 * es distinta a la activa, la activa y regenera el m3u.
 */
async function applyScheduleForClient(clientId) {
  const now = new Date()

  const [tzRows] = await pool.query(
    'SELECT timezone FROM clients WHERE id = ? LIMIT 1',
    [clientId]
  )
  const timeZone = tzRows[0]?.timezone || 'UTC'

  // Obtener la franja activa para este momento
  const [schedules] = await pool.query(
    `SELECT ps.playlistId, ps.startTime, ps.endTime, ps.dayOfWeek
     FROM playlist_schedules ps
     WHERE ps.clientId = ? AND ps.isActive = 1`,
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
    'SELECT id FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1',
    [clientId]
  )
  const currentActiveId = activeRows[0]?.id || null

  if (!scheduledPlaylistId) {
    // No hay franja activa para este momento — no hacemos nada
    return
  }

  if (scheduledPlaylistId === currentActiveId) {
    // Ya está activa la playlist correcta — no hacemos nada
    return
  }

  logger.info({
    clientId,
    from: currentActiveId,
    to: scheduledPlaylistId,
  }, 'Cambio de playlist por parrilla horaria')

  // Desactivar la playlist anterior y activar la nueva
  await pool.query('UPDATE playlists SET isActive = 0 WHERE clientId = ? AND isActive = 1', [clientId])
  await pool.query('UPDATE playlists SET isActive = 1 WHERE id = ?', [scheduledPlaylistId])

  // Regenerar el m3u — liquidsoap lo detecta automáticamente (reload=5000)
  await regenerateM3u(clientId)

  // Log de auditoría
  await pool.query(
    `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
     VALUES (?, ?, 'schedule_switch', ?, NOW())`,
    [uuid(), clientId, JSON.stringify({ fromPlaylist: currentActiveId, toPlaylist: scheduledPlaylistId })]
  )
}
