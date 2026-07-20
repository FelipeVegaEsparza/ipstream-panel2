import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

export default async function folderRoutes(app) {

  // GET /api/streams/:clientId/folders — lista todas las carpetas del cliente
  app.get('/api/streams/:clientId/folders', async (request, reply) => {
    const { clientId } = request.params
    try {
      const [rows] = await pool.query(
        `SELECT id, clientId, name, parentId, createdAt, updatedAt
         FROM folders WHERE clientId = ? ORDER BY name ASC`,
        [clientId]
      )
      return { folders: rows }
    } catch (err) {
      logger.error({ err, clientId }, 'folders: error listing')
      return reply.code(500).send({ error: err.message })
    }
  })

  // POST /api/streams/:clientId/folders — crear carpeta
  app.post('/api/streams/:clientId/folders', async (request, reply) => {
    const { clientId } = request.params
    const { name, parentId } = request.body || {}

    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'name_required', message: 'El nombre es requerido' })
    }

    try {
      const id = uuid()
      await pool.query(
        `INSERT INTO folders (id, clientId, name, parentId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [id, clientId, name.trim(), parentId || null]
      )
      return { ok: true, id, name: name.trim(), parentId: parentId || null }
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'duplicate', message: 'Ya existe una carpeta con ese nombre en esta ubicación' })
      }
      logger.error({ err, clientId }, 'folders: error creating')
      return reply.code(500).send({ error: err.message })
    }
  })

  // PATCH /api/streams/:clientId/folders/:folderId — rename / move folder
  app.patch('/api/streams/:clientId/folders/:folderId', async (request, reply) => {
    const { clientId, folderId } = request.params
    const { name, parentId } = request.body || {}

    const updates = []
    const params = []

    if (name !== undefined) {
      if (!name.trim()) {
        return reply.code(400).send({ error: 'name_required', message: 'El nombre no puede estar vacío' })
      }
      updates.push('name = ?')
      params.push(name.trim())
    }
    if (parentId !== undefined) {
      updates.push('parentId = ?')
      params.push(parentId || null)
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'no_updates', message: 'No hay campos para actualizar' })
    }

    updates.push('updatedAt = NOW()')
    params.push(folderId, clientId)

    try {
      await pool.query(
        `UPDATE folders SET ${updates.join(', ')} WHERE id = ? AND clientId = ?`,
        params
      )
      return { ok: true }
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return reply.code(409).send({ error: 'duplicate', message: 'Ya existe una carpeta con ese nombre en esta ubicación' })
      }
      logger.error({ err, clientId, folderId }, 'folders: error updating')
      return reply.code(500).send({ error: err.message })
    }
  })

  // DELETE /api/streams/:clientId/folders/:folderId — eliminar carpeta
  app.delete('/api/streams/:clientId/folders/:folderId', async (request, reply) => {
    const { clientId, folderId } = request.params

    try {
      // Mover tracks de esta carpeta a null (SetNull cascade)
      // Las subcarpetas se mueven a parent null por ON DELETE SET NULL
      const [result] = await pool.query(
        `DELETE FROM folders WHERE id = ? AND clientId = ?`,
        [folderId, clientId]
      )
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'not_found' })
      }
      return { ok: true }
    } catch (err) {
      logger.error({ err, clientId, folderId }, 'folders: error deleting')
      return reply.code(500).send({ error: err.message })
    }
  })

  // POST /api/streams/:clientId/folders/batch/move — mover tracks a carpeta
  app.post('/api/streams/:clientId/folders/batch/move', async (request, reply) => {
    const { clientId } = request.params
    const { trackIds, folderId } = request.body || {}

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return reply.code(400).send({ error: 'trackIds_required', message: 'Se requiere al menos un trackId' })
    }

    try {
      await pool.query(
        `UPDATE tracks SET folderId = ?, updatedAt = NOW() WHERE id IN (${trackIds.map(() => '?').join(',')}) AND clientId = ?`,
        [folderId || null, ...trackIds, clientId]
      )
      return { ok: true, moved: trackIds.length }
    } catch (err) {
      logger.error({ err, clientId }, 'folders: error batch move')
      return reply.code(500).send({ error: err.message })
    }
  })

  // GET /api/streams/:clientId/folders/stats — track count por carpeta
  app.get('/api/streams/:clientId/folders/stats', async (request, reply) => {
    const { clientId } = request.params
    try {
      const [rows] = await pool.query(
        `SELECT folderId, COUNT(*) as count FROM tracks WHERE clientId = ? GROUP BY folderId`,
        [clientId]
      )
      return { stats: rows }
    } catch (err) {
      logger.error({ err, clientId }, 'folders: error stats')
      return reply.code(500).send({ error: err.message })
    }
  })
}
