// =====================================================
// package-videos.js — Empaqueta el catálogo de TV a HLS (VOD2Live)
// =====================================================
// Uso: node scripts/package-videos.js [clientId] [--force]
//   - Empaqueta los tracks `ready` que aún no tienen hlsPath (o todos con --force).

import { pool } from '../lib/db.js'
import { packageVideo } from '../lib/video-packager.js'

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const clientId = args.find((a) => !a.startsWith('--')) || null

  const [rows] = await pool.query(
    clientId
      ? `SELECT id, clientId, filename, filepath FROM video_tracks WHERE clientId = ? AND status = 'ready' ORDER BY createdAt ASC`
      : `SELECT id, clientId, filename, filepath FROM video_tracks WHERE status = 'ready' ORDER BY createdAt ASC`,
    clientId ? [clientId] : []
  )
  const tracks = (rows || []).filter((t) => force || !t.hlsPath)
  console.log(`Empaquetando ${tracks.length} track(s)${clientId ? ` de ${clientId}` : ''}${force ? ' (--force)' : ''}\n`)

  let done = 0, failed = 0
  for (const t of tracks) {
    const t0 = Date.now()
    try {
      const { hlsPath, renditions } = await packageVideo(t.clientId, t.id, t.filepath)
      await pool.query(`UPDATE video_tracks SET hlsPath = ?, renditions = ? WHERE id = ?`, [
        hlsPath,
        JSON.stringify(renditions || []),
        t.id,
      ])
      done++
      console.log(`  ✓ ${t.filename} -> ${hlsPath} [${(renditions || []).map((r) => r.name).join('+')}] (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
    } catch (err) {
      failed++
      console.error(`  ✗ ${t.filename}: ${err.message}`)
    }
  }

  console.log(`\nListo. Empaquetados: ${done}, fallidos: ${failed}.`)
  await pool.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => { console.error(err); process.exit(1) })
