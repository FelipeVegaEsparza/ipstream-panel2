// =====================================================
// check-conformity.js — Verifica el canónico de TV
// =====================================================
// Uso: node scripts/check-conformity.js [clientId]
// Sale con código 1 si algún track `ready` no cumple el canónico estricto.

import { pool } from '../lib/db.js'
import { checkConformity } from '../lib/video-conformity.js'

async function main() {
  const clientId = process.argv[2] || null

  const [rows] = await pool.query(
    clientId
      ? `SELECT id, clientId, filename, filepath FROM video_tracks WHERE clientId = ? AND status = 'ready'`
      : `SELECT id, clientId, filename, filepath FROM video_tracks WHERE status = 'ready'`,
    clientId ? [clientId] : []
  )

  const tracks = rows || []
  console.log(`Verificando ${tracks.length} track(s)${clientId ? ` de ${clientId}` : ''}...\n`)

  let bad = 0
  for (const t of tracks) {
    try {
      const { ok, reason } = await checkConformity(t.filepath)
      if (!ok) {
        bad++
        console.log(`✗ ${t.filename} [${t.clientId}] — ${reason}`)
      }
    } catch (err) {
      bad++
      console.log(`✗ ${t.filename} [${t.clientId}] — error: ${err.message}`)
    }
  }

  console.log(`\n${tracks.length - bad}/${tracks.length} conformes; ${bad} no conformes.`)
  await pool.end()
  process.exit(bad > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
