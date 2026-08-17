// =====================================================
// Routes — gestión de streams por cliente
// =====================================================

import { startStream, stopStream, restartStream, isProcessRunning, regenerateScript, regenerateM3u, getHarborPort, getRadioDjs } from '../lib/liquidsoap.js'
import { deployIcecastConfig } from '../lib/icecast-config.js'
import { getMountStatus, getGlobalStatus, ping as icecastPing, killSource } from '../lib/icecast.js'
import { pool } from '../lib/db.js'
import { getPlanMaxDjs } from '../lib/plan-caps.js'
import { nextAvailableMount, listAvailableMounts, isMountInUse } from '../lib/mount-allocation.js'
import { logger } from '../lib/logger.js'
import { config } from '../lib/config.js'
import { decrypt, encrypt, isEncrypted } from '../lib/encryption.js'
import { detectAndLogTrack } from '../lib/track-history.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

function sanitizeMount(mount) {
  if (!mount) return ''
  return mount.replace(/^\//, '')
}

// DJ takeover tracking: Map<clientMount, Map<djMount, { connectedAt: number }>>
// Almacena los slots de DJ activos para cada cliente con timestamp de conexión.
const _djSlotActive = new Map()
export { _djSlotActive as _djActive }

// Helper: verificar si algún DJ está conectado para un client mount
function isAnyDjActive(clientMount) {
  const slots = _djSlotActive.get(sanitizeMount(clientMount))
  return slots ? slots.size > 0 : false
}

// Helper: marcar/desmarcar un slot de DJ como activo
function setDjSlotActive(clientMount, djMount, active) {
  const key = sanitizeMount(clientMount)
  if (!_djSlotActive.has(key)) {
    _djSlotActive.set(key, new Map())
  }
  const slots = _djSlotActive.get(key)
  if (active) {
    slots.set(djMount, { connectedAt: Date.now() })
  } else {
    slots.delete(djMount)
  }
  if (slots.size === 0) {
    _djSlotActive.delete(key)
  }
}

export default async function streamRoutes(app) {
  /**
   * GET /api/streams
   * Lista todos los RadioStreams con su estado actual.
   */
  app.get('/api/streams', async (request, reply) => {
    const [rows] = await pool.query(`
      SELECT
        rs.id, rs.clientId, rs.icecastMount, rs.bitrate, rs.status,
        rs.liquidsoapRunning, rs.liquidsoapPid, rs.liquidsoapStartedAt,
        rs.currentTitle, rs.currentArtist, rs.listenerCount, rs.lastStatusAt,
        rs.lastError, rs.updatedAt,
        c.name AS clientName
      FROM radio_streams rs
      JOIN clients c ON c.id = rs.clientId
      ORDER BY c.name ASC
    `)
    return { count: rows.length, streams: rows }
  })

  /**
   * GET /api/streams/:clientId
   * Info detallada de un stream.
   */
  app.get('/api/streams/:clientId', async (request, reply) => {
    const { clientId } = request.params
    const [rows] = await pool.query(`
      SELECT rs.*, c.name AS clientName
      FROM radio_streams rs
      JOIN clients c ON c.id = rs.clientId
      WHERE rs.clientId = ?`, [clientId])
    if (rows.length === 0) return reply.code(404).send({ error: 'not_found' })
    return rows[0]
  })

  /**
   * GET /api/streams/:clientId/status
   * Estado en vivo: combina info de DB + Icecast + DJs.
   */
  app.get('/api/streams/:clientId/status', async (request, reply) => {
    const { clientId } = request.params
    const [rsRows] = await pool.query(`SELECT rs.*, c.name AS clientName
      FROM radio_streams rs JOIN clients c ON c.id = rs.clientId
      WHERE rs.clientId = ?`, [clientId])
    if (rsRows.length === 0) return reply.code(404).send({ error: 'not_found' })
    const rs = rsRows[0]

    // Proceso local
    const proc = await isProcessRunning(rs.icecastMount)

    // Mount en Icecast
    let mount = null
    try {
      mount = await getMountStatus(rs.icecastMount)
    } catch (err) {
      logger.warn({ err: err.message, clientId }, 'No se pudo leer status de Icecast')
    }

    // DJ info: slots activos y conectados
    let djConnected = false
    let djName = null
    let djConnectedAt = null
    const activeSlots = _djSlotActive.get(rs.icecastMount)
    if (activeSlots && activeSlots.size > 0) {
      djConnected = true
      const activeEntries = [...activeSlots.entries()]
      if (activeEntries.length > 0) {
        const [firstMount, firstData] = activeEntries[0]
        djConnectedAt = firstData.connectedAt
        const [djRows] = await pool.query(
          `SELECT name FROM radio_djs WHERE clientId = ? AND mount = ? AND isActive = 1 LIMIT 1`,
          [clientId, firstMount]
        )
        if (djRows.length > 0) {
          djName = djRows[0].name
        }
      }
    }

    return {
      clientId,
      mount: rs.icecastMount,
      clientName: rs.clientName,
      // Estado del proceso liquidsoap
      process: { running: proc.running, pid: proc.pid, startedAt: rs.liquidsoapStartedAt || null },
      // Estado en Icecast
      icecast: mount,
      // Snapshot de la DB
      db: {
        status: rs.status,
        bitrate: rs.bitrate,
        liquidsoapRunning: !!rs.liquidsoapRunning,
        currentTitle: rs.currentTitle,
        currentArtist: rs.currentArtist,
        listenerCount: rs.listenerCount,
        lastError: rs.lastError,
        lastStatusAt: rs.lastStatusAt,
      },
      dj: {
        connected: djConnected,
        name: djName,
        connectedAt: djConnectedAt,
      },
      timestamp: new Date().toISOString(),
    }
  })

  /**
   * POST /api/streams/:clientId/start
   * Inicia el AutoDJ para este cliente.
   */
  app.post('/api/streams/:clientId/start', async (request, reply) => {
    const { clientId } = request.params
    try {
      // Deploy icecast config con per-client passwords antes de arrancar
      await deployIcecastConfig()
      const result = await startStream(clientId)
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt) VALUES (?, ?, 'stream_start', ?, NOW())`,
        [uuid(), clientId, JSON.stringify(result)]
      )
      return { ok: true, ...result }
    } catch (err) {
      logger.error({ err, clientId }, 'Error iniciando stream')
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt) VALUES (?, ?, 'error', ?, NOW())`,
        [uuid(), clientId, JSON.stringify({ phase: 'start', error: err.message })]
      )
      await pool.query(
        `UPDATE radio_streams SET lastError = ?, updatedAt = NOW() WHERE clientId = ?`,
        [err.message.slice(0, 500), clientId]
      )
      return reply.code(500).send({ error: 'start_failed', message: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/stop
   * Detiene el AutoDJ.
   */
  app.post('/api/streams/:clientId/stop', async (request, reply) => {
    const { clientId } = request.params
    try {
      const result = await stopStream(clientId)
      await deployIcecastConfig()
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt) VALUES (?, ?, 'stream_stop', ?, NOW())`,
        [uuid(), clientId, JSON.stringify(result)]
      )
      return { ok: true, ...result }
    } catch (err) {
      logger.error({ err, clientId }, 'Error deteniendo stream')
      return reply.code(500).send({ error: 'stop_failed', message: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/restart
   * Reinicia el AutoDJ.
   */
  app.post('/api/streams/:clientId/restart', async (request, reply) => {
    const { clientId } = request.params
    try {
      await deployIcecastConfig()
      const result = await restartStream(clientId)
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt) VALUES (?, ?, 'stream_restart', ?, NOW())`,
        [uuid(), clientId, JSON.stringify(result)]
      )
      return { ok: true, ...result }
    } catch (err) {
      logger.error({ err, clientId }, 'Error reiniciando stream')
      return reply.code(500).send({ error: 'restart_failed', message: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/dj-takeover
   * Kickea el source de Icecast para que un DJ en vivo pueda conectar.
   * NO matamos liquidsoap: el fallback [djs..., autodj] hace que el DJ tome
   * el aire y al desconectarse, el autodj se reanude automáticamente vía la
   * harbor callback on_disconnected.
   */
  app.post('/api/streams/:clientId/dj-takeover', async (request, reply) => {
    const { clientId } = request.params
    try {
      const [rsRows] = await pool.query(
        `SELECT icecastMount FROM radio_streams WHERE clientId = ? LIMIT 1`,
        [clientId]
      )
      if (rsRows.length === 0) return reply.code(404).send({ error: 'not_found' })
      const mount = rsRows[0].icecastMount

      // Kick source actual de Icecast (la autodj).
      // El DJ que conecte por harbor toma el control vía fallback().
      try {
        await killSource(mount)
        logger.info({ clientId, mount }, 'dj-takeover: source kickeado de Icecast')
      } catch (err) {
        logger.warn({ clientId, mount, err: err.message }, 'dj-takeover: killSource falló (no source?)')
      }

      logger.info({ clientId, mount }, 'dj-takeover: listo para DJ (autodj pausará via fallback al detectar conexión harbor)')
      return { ok: true, message: 'Conectá tu DJ. AutoDJ se reanudará automáticamente cuando se desconecte.' }
    } catch (err) {
      logger.error({ err, clientId }, 'dj-takeover: error')
      return reply.code(500).send({ error: 'dj_takeover_failed', message: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/harbor/connected
   * Llamado por Liquidsoap via system("curl ...") cuando un DJ
   * conecta al input.harbor(). Si viene ?dj=/djX, se trackea el slot.
   */
  app.post('/api/streams/:clientId/harbor/connected', async (request, reply) => {
    const { clientId } = request.params
    const djMount = request.query?.dj || '/live'
    try {
      const [rsRows] = await pool.query(
        `SELECT icecastMount FROM radio_streams WHERE clientId = ? LIMIT 1`,
        [clientId]
      )
      if (rsRows.length === 0) return reply.code(404).send({ error: 'not_found' })
      const mount = sanitizeMount(rsRows[0].icecastMount)

      setDjSlotActive(mount, djMount, true)

      await pool.query(
        `UPDATE radio_streams SET status = 'live', lastError = NULL, updatedAt = NOW() WHERE clientId = ?`,
        [clientId]
      )
      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt) VALUES (?, ?, 'dj_connected', ?, NOW())`,
        [uuid(), clientId, JSON.stringify({ mount, djMount })]
      )
      logger.info({ clientId, mount, djMount }, 'harbor: DJ connected')
      return { ok: true, status: 'live', djMount }
    } catch (err) {
      logger.error({ err, clientId }, 'harbor: error on connected')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/harbor/disconnected
   * Llamado por Liquidsoap cuando un DJ se desconecta del harbor.
   * Si viene ?dj=/djX, se desmarca ese slot específico.
   * Solo cambia a autodj si ningún otro DJ está conectado.
   */
  app.post('/api/streams/:clientId/harbor/disconnected', async (request, reply) => {
    const { clientId } = request.params
    const djMount = request.query?.dj || '/live'
    try {
      const [rsRows] = await pool.query(
        `SELECT icecastMount FROM radio_streams WHERE clientId = ? LIMIT 1`,
        [clientId]
      )
      if (rsRows.length === 0) return reply.code(404).send({ error: 'not_found' })
      const mount = sanitizeMount(rsRows[0].icecastMount)

      setDjSlotActive(mount, djMount, false)
      const anyActive = isAnyDjActive(mount)

      if (!anyActive) {
        await pool.query(
          `UPDATE radio_streams SET status = 'autodj', updatedAt = NOW() WHERE clientId = ?`,
          [clientId]
        )
        logger.info({ clientId, mount, djMount }, 'harbor: último DJ desconectado — AutoDJ resumed')
      } else {
        logger.info({ clientId, mount, djMount }, 'harbor: DJ slot desconectado, otro DJ aún activo')
      }

      await pool.query(
        `INSERT INTO streaming_audit_logs (id, clientId, action, payload, createdAt) VALUES (?, ?, 'dj_disconnected', ?, NOW())`,
        [uuid(), clientId, JSON.stringify({ mount, djMount })]
      )
      return { ok: true, status: anyActive ? 'live' : 'autodj', djMount }
    } catch (err) {
      logger.error({ err, clientId }, 'harbor: error on disconnected')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * GET /api/streams/:clientId/harbor/status
   * Retorna el estado actual del harbor: puerto, DJs activos, slots configurados.
   */
  app.get('/api/streams/:clientId/harbor/status', async (request, reply) => {
    const { clientId } = request.params
    try {
      const [rsRows] = await pool.query(
        `SELECT liquidsoapTelnetPort, icecastMount, status FROM radio_streams WHERE clientId = ? LIMIT 1`,
        [clientId]
      )
      if (rsRows.length === 0) return reply.code(404).send({ error: 'not_found' })
      const { liquidsoapTelnetPort, icecastMount, status } = rsRows[0]
      const mount = sanitizeMount(icecastMount)
      const harborPort = getHarborPort(liquidsoapTelnetPort)

      // DJ slots activos
      const activeSlots = _djSlotActive.get(mount)
      const activeDjMounts = activeSlots ? [...activeSlots.keys()] : []

      // DJs configurados en DB
      const djs = await getRadioDjs(clientId)

      // Plan cap + lista dinámica de mounts disponibles (cambio multi-DJ).
      const planMaxDjs = await getPlanMaxDjs(clientId)
      const availableMounts = await listAvailableMounts(clientId, planMaxDjs)

      return {
        ok: true,
        clientId,
        harborPort,
        mount: '/live',
        djConnected: activeDjMounts.length > 0,
        activeDjMounts,
        planMaxDjs,
        availableMounts,
        djSlots: djs.map(d => ({
          id: d.id,
          name: d.name,
          mount: d.mount,
          priority: d.priority,
          role: d.role,
          isActive: d.isActive,
          connected: activeDjMounts.includes(d.mount),
          connectedAt: activeSlots?.get(d.mount)?.connectedAt || null,
        })),
        streamStatus: status,
      }
    } catch (err) {
      logger.error({ err, clientId }, 'harbor: error on status')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/regenerate-m3u
   * Regenera el playlist.m3u del cliente desde la DB.
   * Llamar después de modificar tracks/playlists.
   */
  app.post('/api/streams/:clientId/regenerate-m3u', async (request, reply) => {
    const { clientId } = request.params
    try {
      const result = await regenerateM3u(clientId)
      return { ok: true, ...result }
    } catch (err) {
      logger.error({ err, clientId }, 'Error regenerando m3u')
      return reply.code(500).send({ error: 'regenerate_m3u_failed', message: err.message })
    }
  })

  /**
   * GET /api/streams/:clientId/now-playing
   * Track actual + próximo + playlist activa.
   */
  app.get('/api/streams/:clientId/now-playing', async (request, reply) => {
    const { clientId } = request.params

    const [rsRows] = await pool.query(
      `SELECT rs.*, c.name AS clientName
       FROM radio_streams rs JOIN clients c ON c.id = rs.clientId
       WHERE rs.clientId = ?`,
      [clientId]
    )
    if (rsRows.length === 0) return reply.code(404).send({ error: 'not_found' })
    const rs = rsRows[0]

    const [plRows] = await pool.query(
      `SELECT p.id, p.name, p.shuffle, p.\`repeat\`, p.trackCount
       FROM playlists p
       WHERE p.clientId = ? AND p.isActive = 1
       LIMIT 1`,
      [clientId]
    )
    const playlist = plRows[0] || null

    let entries = []
    if (playlist) {
      const [eRows] = await pool.query(
        `SELECT t.id AS trackId, t.title, t.artist, t.album, t.duration, t.fileName, t.coverUrl, pe.\`order\`
         FROM playlist_entries pe
         JOIN tracks t ON t.id = pe.trackId
         WHERE pe.playlistId = ?
         ORDER BY pe.\`order\` ASC`,
        [playlist.id]
      )
      entries = eRows
    }

    let currentTrack = null
    let nextTrack = null
    let position = null

    // Load jingles for potential matching
    const [jingleRows] = await pool.query(
      `SELECT id, title, artist, duration, coverUrl FROM jingles WHERE clientId = ? ORDER BY uploadedAt ASC`,
      [clientId]
    )

    const toTrackObj = (e, isJingle = false) => ({
      title: e.title,
      artist: e.artist || null,
      album: isJingle ? null : (e.album || null),
      duration: e.duration,
      coverUrl: e.coverUrl || null,
      isJingle,
    })

    if (entries.length > 0 || jingleRows.length > 0) {
      let icecastTitle = null
      try {
        const mount = await getMountStatus(rs.icecastMount)
        icecastTitle = mount?.title || null
        // Track history — detectar cambios en el track actual y loguear
        if (mount) {
          detectAndLogTrack(clientId, rs).catch(() => {})
        }
      } catch {}

      const currentTitle = icecastTitle || rs.currentTitle

      if (currentTitle) {
        // Try to find in playlist first, then jingles
        const currentIndex = entries.findIndex(
          (e) => e.title && currentTitle.toLowerCase().includes(e.title.toLowerCase())
        )
        if (currentIndex !== -1) {
          currentTrack = toTrackObj(entries[currentIndex])
          position = { index: currentIndex + 1, total: entries.length }

          if (playlist.shuffle) {
            const remaining = entries.filter((_, i) => i !== currentIndex)
            if (remaining.length > 0) {
              const next = remaining[Math.floor(Math.random() * remaining.length)]
              nextTrack = toTrackObj(next)
            }
          } else {
            const nextIndex = currentIndex + 1
            if (nextIndex < entries.length) {
              nextTrack = toTrackObj(entries[nextIndex])
            } else if (playlist?.repeat) {
              nextTrack = toTrackObj(entries[0])
            }
          }
        } else {
          // Try jingles
          const jingleIndex = jingleRows.findIndex(
            (j) => j.title && currentTitle.toLowerCase().includes(j.title.toLowerCase())
          )
          if (jingleIndex !== -1) {
            currentTrack = toTrackObj(jingleRows[jingleIndex], true)
          } else {
            currentTrack = {
              title: currentTitle,
              artist: rs.currentArtist || null,
              album: null,
              duration: null,
              coverUrl: null,
            }
          }
          if (entries.length > 0) {
            nextTrack = toTrackObj(entries[0])
            position = { index: 0, total: entries.length }
          }
        }
      } else if (entries.length > 0) {
        const first = entries[0]
        currentTrack = toTrackObj(first)
        if (entries.length > 1) {
          nextTrack = toTrackObj(entries[1])
        } else if (playlist?.repeat) {
          nextTrack = toTrackObj(first)
        }
        position = { index: 1, total: entries.length }
      }
    }

    return {
      playlist: playlist ? { id: playlist.id, name: playlist.name, shuffle: !!playlist.shuffle, repeat: !!playlist.repeat, trackCount: playlist.trackCount } : null,
      currentTrack,
      nextTrack,
      position,
      jingleCount: jingleRows.length,
    }
  })

  /**
   * GET /api/streams/:clientId/history
   * Historial de reproducción con paginación.
   * Query: page=1&limit=25
   */
  app.get('/api/streams/:clientId/history', async (request, reply) => {
    const { clientId } = request.params
    const page = Math.max(1, parseInt(request.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit, 10) || 25))
    const offset = (page - 1) * limit

    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM play_history WHERE clientId = ?`,
        [clientId]
      )
      const total = countRows[0]?.cnt || 0

      const [rows] = await pool.query(
        `SELECT id, title, artist, type, playedAt
         FROM play_history
         WHERE clientId = ?
         ORDER BY playedAt DESC
         LIMIT ? OFFSET ?`,
        [clientId, limit, offset]
      )

      return {
        entries: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    } catch (err) {
      logger.error({ err, clientId }, 'Error fetching play history')
      return reply.code(500).send({ error: 'history_error', message: err.message })
    }
  })

  /**
   * GET /api/streams/:clientId/djs
   * Lista los slots de DJ de un cliente (sin exponer passwords).
   */
  app.get('/api/streams/:clientId/djs', async (request, reply) => {
    const { clientId } = request.params
    try {
      const djs = await getRadioDjs(clientId)
      return {
        ok: true,
        djs: djs.map((d) => ({
          id: d.id,
          name: d.name,
          mount: d.mount,
          priority: d.priority,
          role: d.role,
          isActive: d.isActive,
          hasPassword: Boolean(d.password),
        })),
      }
    } catch (err) {
      logger.error({ err, clientId }, 'Error listando DJs')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * POST /api/streams/:clientId/djs
   * Crea un nuevo slot de DJ.
   * Body: { name, mount, priority, role, password }
   * El cap viene de Plan.maxDjs; el mount se asigna dinámicamente (próximo /djK libre).
   */
  app.post('/api/streams/:clientId/djs', async (request, reply) => {
    const { clientId } = request.params
    const { name, priority, role, password } = request.body || {}
    try {
      if (!name || !password) {
        return reply.code(400).send({ error: 'name y password son requeridos' })
      }

      const planMaxDjs = await getPlanMaxDjs(clientId)

      // Asignar mount dinámicamente: próximo /djK libre hasta planMaxDjs.
      const mount = await nextAvailableMount(clientId, planMaxDjs)
      if (!mount) {
        return reply.code(400).send({
          error: 'max_djs_reached',
          planMaxDjs,
          message: `El plan permite hasta ${planMaxDjs} DJs por radio.`,
        })
      }

      const validRoles = ['owner', 'host', 'guest']
      const finalRole = validRoles.includes(role) ? role : 'guest'

      const id = uuid()
      const passwordEnc = encrypt(password)

      await pool.query(
        `INSERT INTO radio_djs (id, clientId, name, mount, priority, passwordEnc, role, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [id, clientId, name, mount, priority ?? 1, passwordEnc, finalRole]
      )

      logger.info({ clientId, djId: id, name, mount, role: finalRole, priority, planMaxDjs }, 'DJ slot creado')
      return { ok: true, id, name, mount, priority, role: finalRole, planMaxDjs }
    } catch (err) {
      logger.error({ err, clientId }, 'Error creando DJ slot')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * PATCH /api/streams/:clientId/djs/:djId
   * Actualiza un slot de DJ (nombre, mount, priority, role, password, isActive).
   */
  app.patch('/api/streams/:clientId/djs/:djId', async (request, reply) => {
    const { clientId, djId } = request.params
    const updates = request.body || {}
    try {
      // Validar que existe
      const [existing] = await pool.query(
        `SELECT id FROM radio_djs WHERE id = ? AND clientId = ? LIMIT 1`,
        [djId, clientId]
      )
      if (existing.length === 0) return reply.code(404).send({ error: 'dj_not_found' })

      const sets = []
      const params = []

      if (updates.name) { sets.push('name = ?'); params.push(updates.name) }
      if (updates.mount) {
        const planMaxDjs = await getPlanMaxDjs(clientId)
        const parsed = parseDjMountIndex(updates.mount)
        if (parsed === null || parsed > planMaxDjs) {
          return reply.code(400).send({
            error: 'no_available_mount',
            planMaxDjs,
            message: `mount debe ser uno de /dj1..${planMaxDjs} y estar libre`,
          })
        }
        const inUse = await isMountInUse(clientId, updates.mount, djId)
        if (inUse) {
          return reply.code(409).send({ error: 'mount_in_use', mount: updates.mount })
        }
        sets.push('mount = ?'); params.push(updates.mount)
      }
      if (updates.priority !== undefined) { sets.push('priority = ?'); params.push(updates.priority) }
      if (updates.role) {
        const validRoles = ['owner', 'host', 'guest']
        if (!validRoles.includes(updates.role)) {
          return reply.code(400).send({ error: 'role debe ser owner, host o guest' })
        }
        sets.push('role = ?'); params.push(updates.role)
      }
      if (updates.password) {
        const passwordEnc = encrypt(updates.password)
        sets.push('passwordEnc = ?'); params.push(passwordEnc)
      }
      if (updates.isActive !== undefined) {
        sets.push('isActive = ?'); params.push(updates.isActive ? 1 : 0)
      }

      if (sets.length > 0) {
        sets.push('updatedAt = NOW()')
        params.push(djId, clientId)
        await pool.query(
          `UPDATE radio_djs SET ${sets.join(', ')} WHERE id = ? AND clientId = ?`,
          params
        )
        logger.info({ clientId, djId, updates: Object.keys(updates) }, 'DJ slot actualizado')

        // Regenerar script para aplicar cambios
        try {
          await regenerateScript(clientId)
        } catch (err) {
          logger.warn({ err, clientId }, 'Error regenerando script tras update DJ')
        }
      }

      return { ok: true }
    } catch (err) {
      logger.error({ err, clientId, djId }, 'Error actualizando DJ slot')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * Parsea /djK y devuelve K, o null si el formato no es válido.
   */
  function parseDjMountIndex(mount) {
    if (typeof mount !== 'string') return null
    if (!mount.startsWith('/dj')) return null
    const n = parseInt(mount.slice(3), 10)
    if (!Number.isFinite(n) || n < 1) return null
    return n
  }

  /**
   * DELETE /api/streams/:clientId/djs/:djId
   * Elimina un slot de DJ.
   */
  app.delete('/api/streams/:clientId/djs/:djId', async (request, reply) => {
    const { clientId, djId } = request.params
    try {
      const [result] = await pool.query(
        `DELETE FROM radio_djs WHERE id = ? AND clientId = ?`,
        [djId, clientId]
      )
      if (result.affectedRows === 0) return reply.code(404).send({ error: 'dj_not_found' })

      // Regenerar el script para que el .liq no incluya el input.harbor() del
      // DJ eliminado. Si no, el harbor input queda corriendo hasta el próximo
      // restart de liquidsoap (mantiene el puerto y password viejos).
      try {
        await regenerateScript(clientId)
        logger.info({ clientId, djId }, 'DJ slot eliminado + script regenerado')
      } catch (err) {
        logger.warn({ err, clientId, djId }, 'DJ slot eliminado, pero regenerateScript falló (se arregla en próximo restart)')
      }

      return { ok: true }
    } catch (err) {
      logger.error({ err, clientId, djId }, 'Error eliminando DJ slot')
      return reply.code(500).send({ error: err.message })
    }
  })

  /**
   * GET /api/icecast/status
   * Status global de Icecast (todos los mountpoints).
   */
  app.get('/api/icecast/status', async (request, reply) => {
    try {
      const status = await getGlobalStatus()
      return { ok: true, status }
    } catch (err) {
      return reply.code(502).send({ error: 'icecast_unavailable', message: err.message })
    }
  })

  /**
   * POST /api/streams/auth-source
   * Validación de credenciales de fuente (DJ) para Icecast.
   * Icecast envía form-urlencoded con: mount, user, pass
   * Retorna 200 (ok) o 403 (denegado).
   * Sin auth — Icecast no tiene el token del agente.
   */
  /**
   * GET /api/streams/auth-source/diag?mount=xxxx&pass=yyyy
   * Diagnóstico: simula una autenticación y devuelve el resultado sin efectos.
   * Requiere el token del agente (no es público).
   */
  app.get('/api/streams/auth-source/diag', async (request, reply) => {
    const auth = request.headers.authorization || ''
    const [scheme, token] = auth.split(' ')
    if (scheme !== 'Bearer' || token !== config.agentToken) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    const { mount: qMount, pass: qPass } = request.query

    if (!qMount) {
      return reply.code(400).send({ error: 'Falta ?mount=xxx' })
    }

    const cleanMount = qMount.replace(/^\//, '')
    const result = {
      mount: cleanMount,
      queryPassProvided: !!qPass,
      sharedPasswordConfigured: !!config.ice.sourcePassword,
      livePasswordConfigured: false,
      wouldAuthenticate: false,
      error: null,
    }

    try {
      const [rows] = await pool.query(
        `SELECT sourcePasswordEnc, livePasswordEnc FROM radio_streams WHERE icecastMount = ? LIMIT 1`,
        [cleanMount]
      )

      if (rows.length === 0) {
        result.error = 'mount_not_found'
      } else {
        const passwords = []
        for (const key of ['sourcePasswordEnc', 'livePasswordEnc']) {
          if (rows[0][key] && isEncrypted(rows[0][key])) {
            try {
              const pwd = decrypt(rows[0][key])
              if (pwd) passwords.push(pwd)
            } catch (err) {
              result.error = 'decrypt_error'
            }
          }
        }
        result.livePasswordConfigured = passwords.length > 0
        result.wouldAuthenticate = (config.ice.sourcePassword === qPass) || passwords.includes(qPass)
      }
    } catch (err) {
      result.error = err.message
    }

    return result
  })

  app.post('/api/streams/auth-source', async (request, reply) => {
    try {
      const parseFormBody = (raw) => {
        const out = {}
        try {
          const params = new URLSearchParams(typeof raw === 'string' ? raw : String(raw))
          for (const [k, v] of params.entries()) out[k] = v
        } catch {}
        return out
      }

      const body = request.body
      let fields = {}
      if (typeof body === 'string') {
        fields = parseFormBody(body)
      } else if (body && typeof body === 'object') {
        fields = body
      } else if (Buffer.isBuffer(body)) {
        fields = parseFormBody(body.toString('utf8'))
      }
      const { mount, pass } = fields

      if (!mount || !pass) {
        return reply.code(403).type('text/plain').send('403 missing_fields')
      }

      const cleanMount = mount.replace(/^\//, '')

      const [rows] = await pool.query(
        `SELECT sourcePasswordEnc, livePasswordEnc FROM radio_streams WHERE icecastMount = ? LIMIT 1`,
        [cleanMount]
      )

      if (rows.length === 0) {
        logger.warn({ mount: cleanMount }, 'auth-source: mount no encontrado')
        return reply.code(403).type('text/plain').send('403 mount_not_found')
      }

      const { sourcePasswordEnc, livePasswordEnc } = rows[0]

      const validPasswords = new Set([config.ice.sourcePassword])

      for (const enc of [sourcePasswordEnc, livePasswordEnc]) {
        if (enc && isEncrypted(enc)) {
          try {
            const pwd = decrypt(enc)
            if (pwd) validPasswords.add(pwd)
          } catch (err) {
            logger.warn({ mount: cleanMount, err: err.message }, 'auth-source: error descifrando password')
          }
        }
      }

      if (!validPasswords.has(pass)) {
        logger.warn({ mount: cleanMount }, 'auth-source: password incorrecto')
        return reply.code(403).type('text/plain').send('403 invalid_password')
      }

      // En la nueva arquitectura, DJ se conecta via harbor (Liquidsoap),
      // no via Icecast. auth-source es solo un respaldo.
      return reply.code(200).type('text/plain').send('200')
    } catch (err) {
      logger.error({ err: err.message, body: request.body }, 'auth-source: error')
      return reply.code(403).type('text/plain').send('403 auth_error')
    }
  })
}
