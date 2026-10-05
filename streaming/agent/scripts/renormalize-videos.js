// =====================================================
// renormalize-videos.js — Re-normaliza catálogo de TV
// =====================================================
// Uso: node scripts/renormalize-videos.js [clientId] [--all]
//   - Por defecto re-normaliza solo los tracks no conformes.
//   - Con --all re-normaliza todos los tracks `ready`.
// Secuencial (concurrencia 1) para no saturar la CPU del nodo.

import { pool } from '../lib/db.js'
import { normalizeVideo, extractThumbnail } from '../lib/video-encoder.js'
import { checkConformity, processVideoFile } from '../lib/video-conformity.js'

async function main() {
  const args = process.argv.slice(2)
  const all = args.includes('--all')
  const clientId = args.find((a) => !a.startsWith('--')) || null

  const [rows] = await pool.query(
    clientId
      ? `SELECT id, clientId, filename, filepath FROM video_tracks WHERE clientId = ? AND status = 'ready' ORDER BY createdAt ASC`
      : `SELECT id, clientId, filename, filepath FROM video_tracks WHERE status = 'ready' ORDER BY createdAt ASC`,
    clientId ? [clientId] : []
  )

  const tracks = rows || []
  console.log(`Catálogo: ${tracks.length} track(s)${clientId ? ` de ${clientId}` : ''}${all ? ' (--all)' : ''}\n`)

  let done = 0
  let skipped = 0
  let failed = 0

  for (const t of tracks) {
    try {
      await pool.query(`UPDATE video_tracks SET status = 'processing', processingError = NULL WHERE id = ?`, [t.id])

      let result
      if (all) {
        console.log(`→ ${t.filename} [${t.clientId}] re-encode forzado (--all)...`)
        result = { changed: true, meta: await normalizeVideo(t.clientId, t.filepath) }
      } else {
        const conf = await checkConformity(t.filepath)
        if (conf.videoOk && conf.audioOk) {
          skipped++
          await pool.query(`UPDATE video_tracks SET status = 'ready' WHERE id = ?`, [t.id])
          continue
        }
        console.log(`→ ${t.filename} [${t.clientId}] ${conf.videoOk ? 'remux de audio' : 're-encode'} (${conf.reason})...`)
        result = await processVideoFile(t.clientId, t.filepath)
      }

      const meta = result.meta
      const thumbnail = await extractThumbnail(t.clientId, t.filepath)
      await pool.query(
        `UPDATE video_tracks
         SET status = 'ready', processingError = NULL, filesize = ?, duration = ?,
             width = ?, height = ?, codec = ?, thumbnail = ?
         WHERE id = ?`,
        [
          meta.filesize ?? 0,
          meta.duration ?? 0,
          meta.width ?? null,
          meta.height ?? null,
          meta.codec ?? null,
          thumbnail ?? null,
          t.id,
        ]
      )
      done++
      console.log(`  ✓ ${t.filename} -> ${meta.width}x${meta.height} ${meta.codec}`)
    } catch (err) {
      failed++
      const message = String(err.message || err).slice(0, 1000)
      await pool.query(`UPDATE video_tracks SET status = 'error', processingError = ? WHERE id = ?`, [message, t.id])
      console.error(`  ✗ ${t.filename}: ${message}`)
    }
  }

  console.log(`\nListo. Re-normalizados: ${done}, omitidos (conformes): ${skipped}, fallidos: ${failed}.`)
  await pool.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
