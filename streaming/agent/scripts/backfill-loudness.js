// =====================================================
// Backfill de loudness estático (ReplayGain)
// =====================================================
// Uso:
//   node scripts/backfill-loudness.js <clientId>
//   node scripts/backfill-loudness.js --all
//
// Mide y etiqueta tracks y jingles sin re-encodear audio. Los archivos ya
// etiquetados se omiten.

import { existsSync } from 'fs'
import { pool } from '../lib/db.js'
import { tagLoudness } from '../lib/loudness.js'

const args = process.argv.slice(2)
const all = args.includes('--all')
const clientId = args.find((arg) => !arg.startsWith('--'))

if (!all && !clientId) {
  console.error('Uso: node scripts/backfill-loudness.js <clientId> | --all')
  process.exit(2)
}

async function rowsFor(table, filterClient) {
  const sql = `SELECT id, clientId, filePath FROM ${table} WHERE filePath IS NOT NULL${filterClient ? ' AND clientId = ?' : ''}`
  const [rows] = await pool.query(sql, filterClient ? [filterClient] : [])
  return rows
}

async function main() {
  const tracks = await rowsFor('tracks', all ? null : clientId)
  const jingles = await rowsFor('jingles', all ? null : clientId)
  const items = [
    ...tracks.map((row) => ({ ...row, kind: 'track' })),
    ...jingles.map((row) => ({ ...row, kind: 'jingles' })),
  ]

  console.log(`Backfill: ${items.length} archivos (${tracks.length} tracks, ${jingles.length} jingles)`)
  let tagged = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const label = `[${i + 1}/${items.length}] ${item.kind} ${item.id}`
    if (!item.filePath || !existsSync(item.filePath)) {
      skipped++
      console.log(`${label}: archivo no encontrado`)
      continue
    }
    try {
      const result = await tagLoudness(item.filePath)
      if (result.tagged) {
        tagged++
        console.log(`${label}: ${result.gainDb.toFixed(2)} dB`)
      } else {
        skipped++
        console.log(`${label}: ${result.reason}`)
      }
    } catch (err) {
      failed++
      console.error(`${label}: ERROR ${err.message}`)
    }
  }

  console.log(`Listo. Etiquetados: ${tagged}, omitidos: ${skipped}, fallidos: ${failed}`)
}

main()
  .catch((err) => {
    console.error('Backfill falló:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end().catch(() => {})
  })
