// =====================================================
// renormalize-videos.js — Re-normaliza catálogo de TV
// =====================================================
// Uso: node scripts/renormalize-videos.js [clientId] [--all]
//   - Por defecto re-normaliza solo los tracks no conformes.
//   - Con --all re-normaliza todos los tracks `ready`.
// Secuencial (concurrencia 1) para no saturar la CPU del nodo.

import { pool } from '../lib/db.js'
import { normalizeVideo, extractThumbnail } from '../lib/video-encoder.js'
import { checkConformity } from '../lib/video-conformity.js'

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
      if (!all) {
        const { ok, reason } = await checkConformity(t.filepath)
        if (ok) {
          skipped++
          continue
        }
        console.log(`→ ${t.filename} [${t.clientId}] no conforme (${reason}); re-normalizando...`)
      } else {
        console.log(`→ ${t.filename} [${t.clientId}] re-normalizando (--all)...`)
      }

      await pool.query(`UPDATE video_tracks SET status = 'processing', processingError = NULL WHERE id = ?`, [t.id])
      const normalized = await normalizeVideo(t.clientId, t.filepath)
      const thumbnail = await extractThumbnail(t.clientId, t.filepath)
      await pool.query(
        `UPDATE video_tracks
         SET status = 'ready', processingError = NULL, filesize = ?, duration = ?,
             width = ?, height = ?, codec = ?, thumbnail = ?
         WHERE id = ?`,
        [
          normalized.filesize ?? 0,
          normalized.duration ?? 0,
          normalized.width ?? null,
          normalized.height ?? null,
          normalized.codec ?? null,
          thumbnail ?? null,
          t.id,
        ]
      )
      done++
      console.log(`  ✓ ${t.filename} -> ${normalized.width}x${normalized.height} ${normalized.codec}`)
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
