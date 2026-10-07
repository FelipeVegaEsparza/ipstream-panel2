// =====================================================
// Playout (VOD2Live) — manifiesto vivo (ABR) + segmentos
// =====================================================
// Público (sin token), gateado por streamKey. El canal es un m3u8 EN VIVO que
// referencia segmentos VOD ya empaquetados. En modo ABR se expone un master con
// las rendiciones y un manifiesto vivo por rendición, encadenando assets con
// EXT-X-DISCONTINUITY (sin re-encode).

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import { parseVodPlaylist, buildCycle, buildLiveManifest, buildMasterManifest } from '../lib/channel-stitcher.js'

const VIDEO_DIR = '/var/lib/video'
const CACHE_MS = 5000
// Ancla fija del timeline del canal (estable entre reinicios) → media sequence
// determinístico y consistente para todos los espectadores.
const ANCHOR_MS = 1700000000000

function streamKeyOf(clientId) {
  return `tv_${crypto.createHash('sha256').update(clientId).digest('hex').slice(0, 12)}`
}

function parseRenditions(raw) {
  if (!raw) return []
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

const _cache = new Map() // clientId -> { at, data }

async function getCycle(clientId) {
  const cached = _cache.get(clientId)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data

  // Preferir playlist activa; si no, todas las entries.
  const [activeRows] = await pool.query(
    'SELECT id FROM video_playlists WHERE clientId = ? AND isActive = 1 LIMIT 1',
    [clientId]
  )
  const activeId = activeRows[0]?.id || null
  const [rows] = activeId
    ? await pool.query(
        `SELECT vt.id, vt.hlsPath, vt.renditions FROM video_playlist_entries e JOIN video_tracks vt ON vt.id = e.trackId
         WHERE e.clientId = ? AND e.playlistId = ? AND vt.status = 'ready' AND vt.hlsPath IS NOT NULL
         ORDER BY e.position ASC`,
        [clientId, activeId]
      )
    : await pool.query(
        `SELECT vt.id, vt.hlsPath, vt.renditions FROM video_playlist_entries e JOIN video_tracks vt ON vt.id = e.trackId
         WHERE e.clientId = ? AND vt.status = 'ready' AND vt.hlsPath IS NOT NULL
         ORDER BY e.position ASC`,
        [clientId]
      )

  const assets = []
  const trackRendSets = []
  for (const r of rows || []) {
    const rends = parseRenditions(r.renditions)
    const names = rends.length ? rends.map((x) => x.name) : ['native']
    // Segmentos desde la rendición más alta (o la raíz para tracks legados).
    const ref = rends.length ? rends[0].name : null
    const indexPath = ref
      ? path.join(VIDEO_DIR, r.hlsPath, ref, 'index.m3u8')
      : path.join(VIDEO_DIR, r.hlsPath, 'index.m3u8')
    let segments = []
    try {
      segments = parseVodPlaylist(fs.readFileSync(indexPath, 'utf8')).segments
    } catch (_) { /* asset no empaquetado */ }
    if (segments.length > 0) {
      assets.push({ trackId: r.id, segments })
      trackRendSets.push({ trackId: r.id, rends, names })
    }
  }

  const cycle = buildCycle(assets)

  // Intersección de nombres de rendición en TODOS los tracks del ciclo.
  let common = trackRendSets.length ? trackRendSets[0].names.slice() : []
  for (const t of trackRendSets) common = common.filter((n) => t.names.includes(n))
  const multi = common.filter((n) => n !== 'native')

  const metaByName = {}
  for (const t of trackRendSets) for (const rr of t.rends) metaByName[rr.name] = rr
  const renditions = multi.map((n) => metaByName[n] || { name: n })

  // ABR solo si todas las tracks tienen ladder (sin tracks legados 'native').
  const allMulti = trackRendSets.length > 0 && trackRendSets.every((t) => t.rends.length > 0)
  const abr = multi.length >= 1 && allMulti

  // Rendición a usar por track en modo single (o fallback).
  const trackRendition = {}
  for (const t of trackRendSets) {
    trackRendition[t.trackId] = t.rends.length ? t.rends[0].name : 'native'
  }

  const data = { cycle, renditions: abr ? renditions : [], trackRendition, abr }
  _cache.set(clientId, { at: Date.now(), data })
  return data
}

async function findClient(streamKey) {
  const [rows] = await pool.query('SELECT clientId FROM video_streams')
  return (rows || []).find((r) => streamKeyOf(r.clientId) === streamKey) || null
}

export default async function playoutRoutes(app) {
  // Manifiesto del canal: master (ABR) o manifiesto único (single-rendition).
  app.get('/api/video/playout/:streamKey/live.m3u8', async (req, reply) => {
    const { streamKey } = req.params
    const match = await findClient(streamKey)
    if (!match) { reply.code(404).send({ error: 'not_found' }); return }

    const data = await getCycle(match.clientId)

    if (data.abr) {
      const body = buildMasterManifest(data.renditions)
      reply
        .header('Content-Type', 'application/vnd.apple.mpegurl')
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Access-Control-Allow-Origin', '*')
        .send(body)
      return
    }

    // Single-rendition: manifiesto vivo con la rendición elegida por track.
    const base = `/api/video/playout/${streamKey}/seg`
    const body = buildLiveManifest(data.cycle, ANCHOR_MS, Date.now(), {
      windowSize: 10,
      segmentUrl: (trackId, file) =>
        `${base}/${data.trackRendition[trackId] || 'native'}/${trackId}/${file.replace(/^.*\//, '')}`,
    })
    reply
      .header('Content-Type', 'application/vnd.apple.mpegurl')
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Access-Control-Allow-Origin', '*')
      .send(body)
  })

  // Manifiesto vivo por rendición (ABR).
  app.get('/api/video/playout/:streamKey/live/:rendition', async (req, reply) => {
    const { streamKey } = req.params
    const rendition = String(req.params.rendition || '').replace(/\.m3u8$/, '')
    const match = await findClient(streamKey)
    if (!match) { reply.code(404).send({ error: 'not_found' }); return }

    const data = await getCycle(match.clientId)
    if (!data.abr) { reply.code(404).send({ error: 'not_found' }); return }
    if (!data.renditions.some((r) => r.name === rendition)) {
      reply.code(404).send({ error: 'unknown_rendition' })
      return
    }

    const base = `/api/video/playout/${streamKey}/seg`
    const body = buildLiveManifest(data.cycle, ANCHOR_MS, Date.now(), {
      windowSize: 10,
      segmentUrl: (trackId, file) => `${base}/${rendition}/${trackId}/${file.replace(/^.*\//, '')}`,
    })
    reply
      .header('Content-Type', 'application/vnd.apple.mpegurl')
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Access-Control-Allow-Origin', '*')
      .send(body)
  })

  // Segmentos (.ts) por rendición.
  app.get('/api/video/playout/:streamKey/seg/:rendition/:trackId/:file', async (req, reply) => {
    const { streamKey, rendition, trackId, file } = req.params
    if (!/^[a-zA-Z0-9._-]+$/.test(file) || !/^[a-zA-Z0-9-]+$/.test(trackId) || !/^[a-zA-Z0-9-]+$/.test(rendition)) {
      reply.code(400).send({ error: 'invalid' }); return
    }
    const match = await findClient(streamKey)
    if (!match) { reply.code(404).send({ error: 'not_found' }); return }

    const [trows] = await pool.query(
      'SELECT hlsPath, renditions FROM video_tracks WHERE id = ? AND clientId = ?',
      [trackId, match.clientId]
    )
    const hlsPath = trows[0]?.hlsPath
    if (!hlsPath) { reply.code(404).send({ error: 'not_found' }); return }
    const multi = parseRenditions(trows[0]?.renditions).length > 0

    const baseDir = path.resolve(VIDEO_DIR, hlsPath)
    const abs = multi
      ? path.resolve(baseDir, rendition, file)
      : path.resolve(baseDir, file)
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
