// =====================================================
// Routes — gestión de streams por cliente
// =====================================================

import { startStream, stopStream, restartStream, isProcessRunning, regenerateScript, regenerateM3u } from '../lib/liquidsoap.js'
import { deployIcecastConfig } from '../lib/icecast-config.js'
import { getMountStatus, getGlobalStatus, ping as icecastPing, killSource } from '../lib/icecast.js'
import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { config } from '../lib/config.js'
import { decrypt, isEncrypted } from '../lib/encryption.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

// DJ takeover tracking: mounts donde un DJ está conectado (para reiniciar AutoDJ al irse)
export const _djActive = new Set()

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
   * Estado en vivo: combina info de DB + Icecast.
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

    return {
      clientId,
      mount: rs.icecastMount,
      clientName: rs.clientName,
      // Estado del proceso liquidsoap
      process: { running: proc.running, pid: proc.pid },
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
   */
  app.get('/api/streams/auth-source/diag', async (request, reply) => {
    const { mount: qMount, pass: qPass } = request.query

    if (!qMount) {
      return reply.code(400).send({ error: 'Falta ?mount=xxx' })
    }

    const cleanMount = qMount.replace(/^\//, '')
    const result = {
      mount: cleanMount,
      queryPassProvided: !!qPass,
      sharedPassword: config.ice.sourcePassword ? `***${config.ice.sourcePassword.slice(-3)}` : null,
      livePasswordEnc: null,
      livePasswordDecrypted: null,
      validPasswords: [config.ice.sourcePassword ? `***${config.ice.sourcePassword.slice(-3)}` : '(empty)'],
      wouldAuthenticate: false,
      error: null,
    }

    try {
      const [rows] = await pool.query(
        `SELECT livePasswordEnc FROM radio_streams WHERE icecastMount = ? LIMIT 1`,
        [cleanMount]
      )

      if (rows.length === 0) {
        result.error = 'mount_not_found'
      } else {
        result.livePasswordEnc = rows[0].livePasswordEnc ? 'exists' : 'null'
        if (rows[0].livePasswordEnc && isEncrypted(rows[0].livePasswordEnc)) {
          try {
            const livePwd = decrypt(rows[0].livePasswordEnc)
            result.livePasswordDecrypted = `***${livePwd.slice(-3)}`
            if (livePwd !== config.ice.sourcePassword) {
              result.validPasswords.push(`***${livePwd.slice(-3)}`)
            }
          } catch (err) {
            result.error = `decrypt_error: ${err.message}`
          }
        }
      }

      if (qPass) {
        const expectedPasses = [config.ice.sourcePassword]
        if (result.livePasswordDecrypted) {
          const actualLive = expectedPasses.length > 1 ? expectedPasses[1] : null
        }
        result.wouldAuthenticate = (config.ice.sourcePassword === qPass)
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
      const { mount, user, pass } = fields

      if (!mount || !pass) {
        return reply.code(403).type('text/plain').send('403 missing_fields')
      }

      // mount viene con "/" ej: "/clientId" — lo limpiamos
      const cleanMount = mount.replace(/^\//, '')

      // Buscar el RadioStream por icecastMount
      const [rows] = await pool.query(
        `SELECT clientId, livePasswordEnc FROM radio_streams WHERE icecastMount = ? LIMIT 1`,
        [cleanMount]
      )

      if (rows.length === 0) {
        logger.warn({ mount: cleanMount }, 'auth-source: mount no encontrado')
        return reply.code(403).type('text/plain').send('403 mount_not_found')
      }

      const { clientId, livePasswordEnc } = rows[0]

      // Validar password
      let livePassword = null
      if (livePasswordEnc && isEncrypted(livePasswordEnc)) {
        try {
          livePassword = decrypt(livePasswordEnc)
        } catch (err) {
          logger.warn({ mount: cleanMount, err: err.message }, 'auth-source: error descifrando livePasswordEnc')
        }
      }

      const sharedPassword = config.ice.sourcePassword
      const validPasswords = [sharedPassword]
      if (livePassword && livePassword !== sharedPassword) {
        validPasswords.push(livePassword)
      }

      if (!validPasswords.includes(pass)) {
        logger.warn({ mount: cleanMount, user }, 'auth-source: password incorrecto')
        return reply.code(403).type('text/plain').send('403 invalid_password')
      }

      // Si ya hay un source conectado en Icecast, es un DJ tomando control
      // Kickear el source actual y detener el AutoDJ
      try {
        const currentMount = await getMountStatus(cleanMount)
        if (currentMount) {
          logger.info({ mount: cleanMount, user }, 'auth-source: DJ takeover — kickeando source actual')
          // Kick de Icecast (desconecta el source actual)
          await killSource(cleanMount).catch(() => {})
          // Detener proceso liquidsoap en background
          stopStream(clientId).catch(() => {})
        }
      } catch (err) {
        logger.warn({ mount: cleanMount, err: err.message }, 'auth-source: error al kickear source')
      }

      // Marcar que el DJ está activo en este mount
      _djActive.add(cleanMount)

      logger.info({ mount: cleanMount, user }, 'auth-source: DJ autenticado')
      // Icecast espera que el body comience con "200"
      return reply.code(200).type('text/plain').send('200')
    } catch (err) {
      logger.error({ err: err.message, body: request.body }, 'auth-source: error')
      return reply.code(403).type('text/plain').send('403 auth_error')
    }
  })
}
