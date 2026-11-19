// =====================================================
// Routes — Playlist Schedule (parrilla horaria)
// =====================================================

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import { isTimeInSlotDays, getNextSlots, slotDays } from '../lib/time.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

function normalizeDays(body) {
  const raw = Array.isArray(body?.daysOfWeek)
    ? body.daysOfWeek
    : typeof body?.daysOfWeek === 'string'
      ? body.daysOfWeek.split(',')
      : []
  let days = raw
    .map((day) => String(day).trim())
    .filter((day) => day !== '')
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  if (days.length === 0 && body?.dayOfWeek !== undefined) {
    const legacy = Number(body.dayOfWeek)
    if (Number.isInteger(legacy) && legacy >= 0 && legacy <= 6) days = [legacy]
  }
  return Array.from(new Set(days)).sort((a, b) => a - b)
}

export default async function scheduleRoutes(app) {
  /**
   * GET /api/streams/:clientId/schedule
   * Lista todas las franjas programadas del cliente.
   */
  app.get('/api/streams/:clientId/schedule', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(
      `SELECT ps.id, ps.dayOfWeek, ps.daysOfWeek, ps.startTime, ps.endTime, ps.isActive,
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
    const { playlistId, dayOfWeek, daysOfWeek, startTime, endTime } = request.body || {}
    const days = normalizeDays({ daysOfWeek, dayOfWeek })

    if (!playlistId || days.length === 0 || !startTime || !endTime) {
      return reply.code(400).send({ error: 'faltan_campos', message: 'playlistId, daysOfWeek, startTime y endTime son requeridos' })
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
      `INSERT INTO playlist_schedules (id, clientId, radioStreamId, playlistId, dayOfWeek, daysOfWeek, startTime, endTime, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [id, clientId, radioStreamId, playlistId, days[0], days.join(','), startTime, endTime]
    )

    logger.info({ clientId, scheduleId: id, playlistId, daysOfWeek: days, startTime, endTime }, 'Franja horaria creada')
    return { id, playlistId, dayOfWeek: days[0], daysOfWeek: days.join(','), startTime, endTime }
  })

  /**
   * PATCH /api/streams/:clientId/schedule/:id
   * Actualiza una franja horaria.
   */
  app.patch('/api/streams/:clientId/schedule/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const { playlistId, dayOfWeek, daysOfWeek, startTime, endTime, isActive } = request.body || {}

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
    if (daysOfWeek !== undefined || dayOfWeek !== undefined) {
      const days = normalizeDays({ daysOfWeek, dayOfWeek })
      if (days.length === 0) return reply.code(400).send({ error: 'daysOfWeek_invalido' })
      fields.push('dayOfWeek = ?')
      values.push(days[0])
      fields.push('daysOfWeek = ?')
      values.push(days.join(','))
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
      `SELECT ps.id, ps.playlistId, ps.dayOfWeek, ps.daysOfWeek, ps.startTime, ps.endTime,
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
      if (isTimeInSlotDays(now, slotDays(slot), slot.startTime, slot.endTime, timeZone)) {
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
    `SELECT ps.playlistId, ps.startTime, ps.endTime, ps.dayOfWeek, ps.daysOfWeek
     FROM playlist_schedules ps
     WHERE ps.clientId = ? AND ps.isActive = 1`,
    [clientId]
  )

  let scheduledPlaylistId = null
  for (const slot of schedules) {
    if (isTimeInSlotDays(now, slotDays(slot), slot.startTime, slot.endTime, timeZone)) {
      scheduledPlaylistId = slot.playlistId
      break
    }
  }

  // Obtener la playlist actualmente activa y la playlist de respaldo
  const [activeRows] = await pool.query(
    'SELECT id FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1',
    [clientId]
  )
  const currentActiveId = activeRows[0]?.id || null

  const [rsRows] = await pool.query(
    'SELECT scheduleFallbackPlaylistId FROM radio_streams WHERE clientId = ? LIMIT 1',
    [clientId]
  )
  let fallbackId = rsRows[0]?.scheduleFallbackPlaylistId || null
  const scheduledPlaylistIds = new Set(schedules.map((slot) => slot.playlistId))

  if (!scheduledPlaylistId) {
    // No hay franja activa: restaurar la playlist que sonaba antes de la
    // parrilla. Para instalaciones que ya tenían un cambio aplicado antes de
    // esta función, se infiere desde el último schedule_switch.
    if (!fallbackId && currentActiveId && scheduledPlaylistIds.has(currentActiveId)) {
      const [logs] = await pool.query(
        `SELECT payload FROM streaming_audit_logs
         WHERE clientId = ? AND action = 'schedule_switch'
         ORDER BY createdAt DESC LIMIT 1`,
        [clientId]
      )
      try {
        let payload = logs[0]?.payload
        if (Buffer.isBuffer(payload)) payload = payload.toString('utf8')
        if (typeof payload === 'string') payload = JSON.parse(payload)
        if (payload?.fromPlaylist) fallbackId = payload.fromPlaylist
      } catch {}
    }

    if (!fallbackId) return

    if (fallbackId === currentActiveId) {
      await pool.query(
        'UPDATE radio_streams SET scheduleFallbackPlaylistId = NULL WHERE clientId = ?',
        [clientId]
      )
      return
    }

    const [fallbackRows] = await pool.query(
      'SELECT id FROM playlists WHERE id = ? AND clientId = ? LIMIT 1',
      [fallbackId, clientId]
    )

    if (fallbackRows.length === 0) {
      // La playlist de respaldo ya no existe: limpiar y no tocar la actual.
      await pool.query(
        'UPDATE radio_streams SET scheduleFallbackPlaylistId = NULL WHERE clientId = ?',
        [clientId]
      )
      return
    }

    logger.info({
      clientId,
      from: currentActiveId,
      to: fallbackId,
    }, 'Fin de franja: se restaura la playlist de respaldo')

    await pool.query('UPDATE playlists SET isActive = 0 WHERE clientId = ? AND isActive = 1', [clientId])
    await pool.query('UPDATE playlists SET isActive = 1 WHERE id = ?', [fallbackId])
    await pool.query(
      'UPDATE radio_streams SET scheduleFallbackPlaylistId = NULL WHERE clientId = ?',
      [clientId]
    )
    await regenerateM3u(clientId)
    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'schedule_fallback', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ fromPlaylist: currentActiveId, toPlaylist: fallbackId })]
    )
    return
  }

  if (scheduledPlaylistId === currentActiveId) {
    // Ya está activa la playlist correcta — no hacemos nada
    return
  }

  // Guardar la playlist que se reemplaza para restaurarla al terminar la franja.
  if (!fallbackId && currentActiveId && !scheduledPlaylistIds.has(currentActiveId)) {
    fallbackId = currentActiveId
    await pool.query(
      'UPDATE radio_streams SET scheduleFallbackPlaylistId = ? WHERE clientId = ?',
      [fallbackId, clientId]
    )
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
