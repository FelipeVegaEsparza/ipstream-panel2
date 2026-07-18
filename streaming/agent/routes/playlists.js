// =====================================================
// Routes — Playlists (CRUD + activate + entries + reorder)
// =====================================================

import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { regenerateM3u } from '../lib/liquidsoap.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

const MAX_NAME = 100
const MAX_DESCRIPTION = 1000

export default async function playlistRoutes(app) {
  /**
   * GET /api/streams/:clientId/playlists
   * Lista todas las playlists del cliente (con track count).
   */
  app.get('/api/streams/:clientId/playlists', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(
      `SELECT p.id, p.name, p.description, p.isActive, p.shuffle, p.\`repeat\`, p.trackCount,
              p.totalDuration, p.createdAt, p.updatedAt,
              (SELECT COUNT(*) FROM playlist_entries pe WHERE pe.playlistId = p.id) AS entryCount
       FROM playlists p
       WHERE p.clientId = ?
       ORDER BY p.isActive DESC, p.updatedAt DESC`,
      [clientId]
    )
    return { count: rows.length, playlists: rows }
  })

  /**
   * GET /api/streams/:clientId/playlists/:id
   * Detalle de una playlist con sus entries.
   */
  app.get('/api/streams/:clientId/playlists/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const [plRows] = await pool.query(
      `SELECT p.*, c.name AS clientName
       FROM playlists p
       JOIN clients c ON c.id = p.clientId
       WHERE p.id = ? AND p.clientId = ?`,
      [id, clientId]
    )
    if (plRows.length === 0) return reply.code(404).send({ error: 'not_found' })
    const playlist = plRows[0]

    const [entries] = await pool.query(
      `SELECT pe.id AS entryId, pe.\`order\`, pe.createdAt,
              t.id AS trackId, t.title, t.artist, t.album, t.duration, t.fileName, t.coverUrl
       FROM playlist_entries pe
       JOIN tracks t ON t.id = pe.trackId
       WHERE pe.playlistId = ?
       ORDER BY pe.\`order\` ASC`,
      [id]
    )

    return { ...playlist, entries }
  })

  /**
   * POST /api/streams/:clientId/playlists
   * Crea una nueva playlist (vacía).
   */
  app.post('/api/streams/:clientId/playlists', async (request, reply) => {
    const { clientId } = request.params
    const { name, description, shuffle, repeat } = request.body || {}

    if (typeof name !== 'string' || name.length === 0) {
      return reply.code(400).send({ error: 'name_required' })
    }

    // Verificar que el cliente tiene un RadioStream
    const [rsRows] = await pool.query(`SELECT id FROM radio_streams WHERE clientId = ?`, [clientId])
    if (rsRows.length === 0) return reply.code(404).send({ error: 'radio_stream_not_found' })
    const radioStreamId = rsRows[0].id

    const playlistId = 'pl_' + uuid().slice(0, 8)
    await pool.query(
      `INSERT INTO playlists (id, clientId, radioStreamId, name, description, isActive, shuffle, \`repeat\`, trackCount, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0, NOW(), NOW())`,
      [
        playlistId, clientId, radioStreamId,
        name.slice(0, MAX_NAME),
        (description || null)?.toString().slice(0, MAX_DESCRIPTION),
        shuffle === true ? 1 : 0,
        repeat === false ? 0 : 1,  // default true
      ]
    )

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'playlist_create', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ playlistId, name })]
    )

    logger.info({ clientId, playlistId, name }, 'Playlist creada')
    return { ok: true, playlistId, name }
  })

  /**
   * PATCH /api/streams/:clientId/playlists/:id
   * Edita nombre/descripcion/shuffle/repeat.
   */
  app.patch('/api/streams/:clientId/playlists/:id', async (request, reply) => {
    const { clientId, id } = request.params
    const { name, description, shuffle, repeat } = request.body || {}

    const sets = []
    const params = []
    if (typeof name === 'string' && name.length > 0) { sets.push('name = ?'); params.push(name.slice(0, MAX_NAME)) }
    if (typeof description === 'string' || description === null) {
      sets.push('description = ?')
      params.push(description ? description.slice(0, MAX_DESCRIPTION) : null)
    }
    if (typeof shuffle === 'boolean') { sets.push('shuffle = ?'); params.push(shuffle ? 1 : 0) }
    if (typeof repeat === 'boolean') { sets.push('`repeat` = ?'); params.push(repeat ? 1 : 0) }
    if (sets.length === 0) {
      return reply.code(400).send({ error: 'no_fields' })
    }
    sets.push('updatedAt = NOW()')
    params.push(id, clientId)

    const [result] = await pool.query(
      `UPDATE playlists SET ${sets.join(', ')} WHERE id = ? AND clientId = ?`,
      params
    )
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }

    // Si cambió, regenerar m3u (por si shuffle/repeat cambiaron)
    if (shuffle !== undefined || repeat !== undefined) {
      try {
        const [isActiveRows] = await pool.query(
          `SELECT isActive FROM playlists WHERE id = ?`, [id]
        )
        if (isActiveRows[0]?.isActive) {
          await regenerateM3u(clientId)
        }
      } catch {}
    }
    return { ok: true }
  })

  /**
   * DELETE /api/streams/:clientId/playlists/:id
   * Elimina playlist y sus entries. Si era la activa, desactiva.
   */
  app.delete('/api/streams/:clientId/playlists/:id', async (request, reply) => {
    const { clientId, id } = request.params

    const [plRows] = await pool.query(
      `SELECT id, isActive FROM playlists WHERE id = ? AND clientId = ?`, [id, clientId]
    )
    if (plRows.length === 0) return reply.code(404).send({ error: 'not_found' })
    const wasActive = plRows[0].isActive

    await pool.query(`DELETE FROM playlists WHERE id = ?`, [id])

    if (wasActive) {
      try { await regenerateM3u(clientId) } catch {}
    }

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'playlist_delete', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ playlistId: id, wasActive })]
    )

    logger.info({ clientId, playlistId: id, wasActive }, 'Playlist eliminada')
    return { ok: true }
  })

  /**
   * POST /api/streams/:clientId/playlists/:id/activate
   * Marca la playlist como activa (desactiva las demás del mismo cliente).
   * Regenera el m3u.
   */
  app.post('/api/streams/:clientId/playlists/:id/activate', async (request, reply) => {
    const { clientId, id } = request.params
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      const [plRows] = await conn.query(
        `SELECT id, isActive FROM playlists WHERE id = ? AND clientId = ? FOR UPDATE`, [id, clientId]
      )
      if (plRows.length === 0) {
        await conn.rollback()
        return reply.code(404).send({ error: 'not_found' })
      }

      // Desactivar todas las del cliente
      await conn.query(`UPDATE playlists SET isActive = 0, updatedAt = NOW() WHERE clientId = ?`, [clientId])
      // Activar la seleccionada
      await conn.query(`UPDATE playlists SET isActive = 1, updatedAt = NOW() WHERE id = ?`, [id])

      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }

    // Regenerar m3u y reiniciar stream si está corriendo
    await regenerateM3u(clientId)
    try {
      const { regenerateScript } = await import('../lib/liquidsoap.js')
      await regenerateScript(clientId)
    } catch (err) {
      logger.warn({ err, clientId }, 'No se pudo regenerar el script (no es crítico)')
    }

    await pool.query(
      `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt)
       VALUES (?, ?, 'playlist_activate', ?, NOW())`,
      [uuid(), clientId, JSON.stringify({ playlistId: id })]
    )

    logger.info({ clientId, playlistId: id }, 'Playlist activada')
    return { ok: true }
  })

  /**
   * POST /api/streams/:clientId/playlists/:id/tracks
   * Agrega un track a la playlist (al final).
   * Body: { trackId }
   */
  app.post('/api/streams/:clientId/playlists/:id/tracks', async (request, reply) => {
    const { clientId, id } = request.params
    const { trackId } = request.body || {}
    if (!trackId) return reply.code(400).send({ error: 'trackId_required' })

    // Verificar que la playlist y el track pertenecen al cliente
    const [plRows] = await pool.query(
      `SELECT id FROM playlists WHERE id = ? AND clientId = ?`, [id, clientId]
    )
    if (plRows.length === 0) return reply.code(404).send({ error: 'playlist_not_found' })

    const [trRows] = await pool.query(
      `SELECT id FROM tracks WHERE id = ? AND clientId = ?`, [trackId, clientId]
    )
    if (trRows.length === 0) return reply.code(404).send({ error: 'track_not_found' })

    // Verificar que no esté ya en la playlist
    const [existing] = await pool.query(
      `SELECT id FROM playlist_entries WHERE playlistId = ? AND trackId = ?`, [id, trackId]
    )
    if (existing.length > 0) return reply.code(409).send({ error: 'already_in_playlist' })

    // Siguiente order
    const [maxRows] = await pool.query(
      `SELECT COALESCE(MAX(\`order\`), 0) AS maxOrder FROM playlist_entries WHERE playlistId = ?`,
      [id]
    )
    const nextOrder = maxRows[0].maxOrder + 1

    const entryId = 'pe_' + uuid().slice(0, 8)
    await pool.query(
      `INSERT INTO playlist_entries (id, playlistId, trackId, \`order\`, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [entryId, id, trackId, nextOrder]
    )
    await updatePlaylistStats(id)

    // Si la playlist está activa, regenerar m3u
    const [activeRows] = await pool.query(
      `SELECT isActive FROM playlists WHERE id = ?`, [id]
    )
    if (activeRows[0]?.isActive) {
      await regenerateM3u(clientId)
    }
    return { ok: true, entryId, order: nextOrder }
  })

  /**
   * POST /api/streams/:clientId/playlists/:id/tracks/bulk
   * Agrega multiples tracks a la playlist.
   * Body: { trackIds }
   */
  app.post('/api/streams/:clientId/playlists/:id/tracks/bulk', async (request, reply) => {
    const { clientId, id } = request.params
    const { trackIds } = request.body || {}
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return reply.code(400).send({ error: 'trackIds_required' })
    }

    const [plRows] = await pool.query(
      `SELECT id FROM playlists WHERE id = ? AND clientId = ?`, [id, clientId]
    )
    if (plRows.length === 0) return reply.code(404).send({ error: 'playlist_not_found' })

    const results = { added: 0, skipped: 0, errors: [] }

    for (const trackId of trackIds) {
      try {
        const [trRows] = await pool.query(
          `SELECT id FROM tracks WHERE id = ? AND clientId = ?`, [trackId, clientId]
        )
        if (trRows.length === 0) {
          results.errors.push({ trackId, reason: 'not_found' })
          continue
        }

        const [existing] = await pool.query(
          `SELECT id FROM playlist_entries WHERE playlistId = ? AND trackId = ?`, [id, trackId]
        )
        if (existing.length > 0) {
          results.skipped++
          continue
        }

        const [maxRows] = await pool.query(
          `SELECT COALESCE(MAX(\`order\`), 0) AS maxOrder FROM playlist_entries WHERE playlistId = ?`,
          [id]
        )
        const nextOrder = maxRows[0].maxOrder + 1
        const entryId = 'pe_' + uuid().slice(0, 8)

        await pool.query(
          `INSERT INTO playlist_entries (id, playlistId, trackId, \`order\`, createdAt)
           VALUES (?, ?, ?, ?, NOW())`,
          [entryId, id, trackId, nextOrder]
        )
        results.added++
      } catch (err) {
        results.errors.push({ trackId, reason: err.message })
      }
    }

    await updatePlaylistStats(id)

    const [activeRows] = await pool.query(
      `SELECT isActive FROM playlists WHERE id = ?`, [id]
    )
    if (activeRows[0]?.isActive) {
      await regenerateM3u(clientId)
    }

    return { ok: true, ...results }
  })

  /**
   * DELETE /api/streams/:clientId/playlists/:id/tracks/:trackId
   * Quita un track de la playlist.
   */
  app.delete('/api/streams/:clientId/playlists/:id/tracks/:trackId', async (request, reply) => {
    const { clientId, id, trackId } = request.params

    const [result] = await pool.query(
      `DELETE pe FROM playlist_entries pe
       JOIN playlists p ON p.id = pe.playlistId
       WHERE pe.playlistId = ? AND pe.trackId = ? AND p.clientId = ?`,
      [id, trackId, clientId]
    )
    if (result.affectedRows === 0) return reply.code(404).send({ error: 'not_found' })

    await updatePlaylistStats(id)

    const [activeRows] = await pool.query(`SELECT isActive FROM playlists WHERE id = ?`, [id])
    if (activeRows[0]?.isActive) {
      await regenerateM3u(clientId)
    }
    return { ok: true }
  })

  /**
   * POST /api/streams/:clientId/playlists/:id/reorder
   * Reordena tracks. Body: { trackIds: ['trk_1', 'trk_2', ...] } (nuevo orden)
   */
  app.post('/api/streams/:clientId/playlists/:id/reorder', async (request, reply) => {
    const { clientId, id } = request.params
    const { trackIds } = request.body || {}
    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      return reply.code(400).send({ error: 'trackIds_required', message: 'Envía trackIds como array' })
    }

    // Verificar que la playlist es del cliente
    const [plRows] = await pool.query(
      `SELECT id FROM playlists WHERE id = ? AND clientId = ?`, [id, clientId]
    )
    if (plRows.length === 0) return reply.code(404).send({ error: 'not_found' })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (let i = 0; i < trackIds.length; i++) {
        await conn.query(
          `UPDATE playlist_entries SET \`order\` = ? WHERE playlistId = ? AND trackId = ?`,
          [i + 1, id, trackIds[i]]
        )
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }

    const [activeRows] = await pool.query(`SELECT isActive FROM playlists WHERE id = ?`, [id])
    if (activeRows[0]?.isActive) {
      await regenerateM3u(clientId)
    }
    return { ok: true }
  })
}

/**
 * Recalcula trackCount y totalDuration de una playlist.
 */
async function updatePlaylistStats(playlistId) {
  await pool.query(
    `UPDATE playlists p
     SET trackCount = (SELECT COUNT(*) FROM playlist_entries WHERE playlistId = p.id),
         totalDuration = (SELECT COALESCE(SUM(t.duration), 0) FROM playlist_entries pe JOIN tracks t ON t.id = pe.trackId WHERE pe.playlistId = p.id),
         updatedAt = NOW()
     WHERE p.id = ?`,
    [playlistId]
  )
}
