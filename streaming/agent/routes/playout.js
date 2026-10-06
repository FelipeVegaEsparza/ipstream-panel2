// =====================================================
// Playout (VOD2Live) — manifiesto vivo + segmentos
// =====================================================
// Público (sin token), gateado por streamKey. El canal es un m3u8 EN VIVO que
// referencia segmentos VOD ya empaquetados, encadenando assets con
// EXT-X-DISCONTINUITY (sin re-encode).

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { parseVodPlaylist, buildCycle, buildLiveManifest } from '../lib/channel-stitcher.js'

const VIDEO_DIR = '/var/lib/video'
const CACHE_MS = 5000
// Ancla fija del timeline del canal (estable entre reinicios) → media sequence
// determinístico y consistente para todos los espectadores.
const ANCHOR_MS = 1700000000000

function streamKeyOf(clientId) {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

const _cache = new Map() // clientId -> { at, cycle }

async function getCycle(clientId) {
  const cached = _cache.get(clientId)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.cycle

  // Preferir playlist activa; si no, todas las entries.
  const [activeRows] = await pool.query(
    'SELECT id FROM video_playlists WHERE clientId = ? AND isActive = 1 LIMIT 1',
    [clientId]
  )
  const activeId = activeRows[0]?.id || null
  const [rows] = activeId
    ? await pool.query(
        `SELECT vt.id, vt.hlsPath FROM video_playlist_entries e JOIN video_tracks vt ON vt.id = e.trackId
         WHERE e.clientId = ? AND e.playlistId = ? AND vt.status = 'ready' AND vt.hlsPath IS NOT NULL
         ORDER BY e.position ASC`,
        [clientId, activeId]
      )
    : await pool.query(
        `SELECT vt.id, vt.hlsPath FROM video_playlist_entries e JOIN video_tracks vt ON vt.id = e.trackId
         WHERE e.clientId = ? AND vt.status = 'ready' AND vt.hlsPath IS NOT NULL
         ORDER BY e.position ASC`,
        [clientId]
      )

  const assets = []
  for (const r of rows || []) {
    try {
      const text = fs.readFileSync(path.join(VIDEO_DIR, r.hlsPath, 'index.m3u8'), 'utf8')
      const { segments } = parseVodPlaylist(text)
      if (segments.length > 0) assets.push({ trackId: r.id, segments })
    } catch (_) { /* asset no empaquetado */ }
  }
  const cycle = buildCycle(assets)
  _cache.set(clientId, { at: Date.now(), cycle })
  return cycle
}

export default async function playoutRoutes(app) {
  // Manifiesto vivo del canal
  app.get('/api/video/playout/:streamKey/live.m3u8', async (req, reply) => {
    const { streamKey } = req.params
    const [rows] = await pool.query('SELECT clientId FROM video_streams')
    const match = (rows || []).find((r) => streamKeyOf(r.clientId) === streamKey)
    if (!match) { reply.code(404).send({ error: 'not_found' }); return }

    const cycle = await getCycle(match.clientId)
    const base = `/api/video/playout/${streamKey}/seg`
    const body = buildLiveManifest(cycle, ANCHOR_MS, Date.now(), {
      windowSize: 10,
      segmentUrl: (trackId, file) => `${base}/${trackId}/${file.replace(/^.*\//, '')}`,
    })
    reply
      .header('Content-Type', 'application/vnd.apple.mpegurl')
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Access-Control-Allow-Origin', '*')
      .send(body)
  })

  // Segmentos (.ts)
  app.get('/api/video/playout/:streamKey/seg/:trackId/:file', async (req, reply) => {
    const { streamKey, trackId, file } = req.params
    if (!/^[a-zA-Z0-9._-]+$/.test(file) || !/^[a-zA-Z0-9-]+$/.test(trackId)) {
      reply.code(400).send({ error: 'invalid' }); return
    }
    const [rows] = await pool.query('SELECT clientId FROM video_streams')
    const match = (rows || []).find((r) => streamKeyOf(r.clientId) === streamKey)
    if (!match) { reply.code(404).send({ error: 'not_found' }); return }

    const [trows] = await pool.query('SELECT hlsPath FROM video_tracks WHERE id = ? AND clientId = ?', [trackId, match.clientId])
    const hlsPath = trows[0]?.hlsPath
    if (!hlsPath) { reply.code(404).send({ error: 'not_found' }); return }

    const abs = path.resolve(VIDEO_DIR, hlsPath, file)
    const baseDir = path.resolve(VIDEO_DIR, hlsPath)
    if (!abs.startsWith(baseDir + path.sep)) { reply.code(400).send({ error: 'invalid' }); return }

    try {
      reply
        .header('Content-Type', 'video/mp2t')
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .header('Access-Control-Allow-Origin', '*')
      await reply.send(fs.createReadStream(abs))
    } catch (err) {
      logger.warn({ err: err.message, abs }, 'Segmento no encontrado')
      reply.code(404).send({ error: 'not_found' })
    }
  })
}
