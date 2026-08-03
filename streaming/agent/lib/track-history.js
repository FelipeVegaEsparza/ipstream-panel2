// =====================================================
// Track History — detection & logging
// =====================================================

import { pool } from './db.js'
import { logger } from './logger.js'
import { getMountStatus } from './icecast.js'
import crypto from 'crypto'

function uuid() {
  return crypto.randomUUID()
}

// Last known track per clientId: Map<clientId, { title, artist, type }>
const _lastTrack = new Map()

export { _lastTrack }

function parseArtistFromTitle(title) {
  if (!title) return { title: null, artist: null }
  const separators = [' - ', ' – ', ' — ', '_-_', '_–_']
  for (const sep of separators) {
    const idx = title.indexOf(sep)
    if (idx > 0) {
      return {
        artist: title.slice(0, idx).trim() || null,
        title: title.slice(idx + sep.length).trim() || title.trim(),
      }
    }
  }
  return { title: title.trim(), artist: null }
}

/**
 * Detecta si el track cambió en Icecast y lo registra en play_history.
 * Se llama desde el endpoint /now-playing (que ya se ejecuta cada 5s).
 */
export async function detectAndLogTrack(clientId, rs) {
  try {
    const mount = await getMountStatus(rs.icecastMount)
    if (!mount) return

    const icecastTitle = mount.title?.trim() || null
    if (!icecastTitle) return

    const last = _lastTrack.get(clientId)
    if (last && last.title === icecastTitle) return

    // Intentar determinar el tipo buscando en playlist activa y jingles
    let type = 'autodj'
    let resolvedTitle = icecastTitle
    let resolvedArtist = null

    const parsed = parseArtistFromTitle(icecastTitle)

    const [plRows] = await pool.query(
      `SELECT id FROM playlists WHERE clientId = ? AND isActive = 1 LIMIT 1`,
      [clientId]
    )

    if (plRows.length > 0) {
      const [entries] = await pool.query(
        `SELECT t.title, t.artist FROM playlist_entries pe
         JOIN tracks t ON t.id = pe.trackId
         WHERE pe.playlistId = ?
         ORDER BY pe.\`order\` ASC`,
        [plRows[0].id]
      )
      const matched = entries.find(
        (e) => e.title && icecastTitle.toLowerCase().includes(e.title.toLowerCase())
      )
      if (matched) {
        type = 'music'
        resolvedTitle = matched.title
        resolvedArtist = matched.artist || parsed.artist
      } else {
        resolvedTitle = parsed.title
        resolvedArtist = parsed.artist
      }
    }

    if (type === 'autodj') {
      const [jingleRows] = await pool.query(
        `SELECT title, artist FROM jingles WHERE clientId = ?`,
        [clientId]
      )
      const matched = jingleRows.find(
        (j) => j.title && icecastTitle.toLowerCase().includes(j.title.toLowerCase())
      )
      if (matched) {
        type = 'jingle'
        resolvedTitle = matched.title
        resolvedArtist = matched.artist || parsed.artist
      } else {
        resolvedTitle = parsed.title
        resolvedArtist = parsed.artist
      }
    }

    await pool.query(
      `INSERT INTO play_history (id, clientId, radioStreamId, title, artist, type, playedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuid(), clientId, rs.id, resolvedTitle, resolvedArtist, type]
    )

    _lastTrack.set(clientId, { title: icecastTitle, artist: resolvedArtist, type })
    logger.info({ clientId, title: resolvedTitle, type }, 'Track logged')
  } catch (err) {
    logger.warn({ err: err.message, clientId }, 'detectAndLogTrack error')
  }
}
