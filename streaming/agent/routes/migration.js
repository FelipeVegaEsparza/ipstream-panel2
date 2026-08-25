// =====================================================
// Migration routes — copia de archivos entre servidores.
// SOLO manipulan el filesystem (nunca la DB): la metadata ya vive
// en la DB central y no cambia al migrar. El panel orquesta la migración.
// =====================================================

import { writeFile, unlink, mkdir, readdir } from 'fs/promises'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { exec } from 'child_process'
import { tmpdir } from 'os'
import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'
import {
  clientMp3Dir,
  clientJinglesDir,
  clientCoversDir,
  isSafeFileName,
} from '../lib/files.js'
import { execCmd, ENCODER_CONTAINER } from '../lib/video-encoder.js'

const VIDEO_DIR = '/var/lib/video'

function execBuffer(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: 'buffer', maxBuffer: 500 * 1024 * 1024, timeout: 60000 }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

function isSafeRelativePath(name) {
  if (typeof name !== 'string') return false
  if (name.includes('..') || name.includes('\\') || name.startsWith('/')) return false
  return true
}

/**
 * POST /api/migrate/:clientId/import
 * multipart: file + fields kind + name
 * kind: 'radio-mp3' | 'radio-jingle' | 'radio-cover' | 'video-file' | 'video-thumbnail'
 */
export default async function migrationRoutes(app) {
  app.post('/api/migrate/:clientId/import', async (request, reply) => {
    const { clientId } = request.params
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'no_file' })
    }
    const kind = data.fields?.kind
    const name = data.fields?.name
    if (!kind || !name) {
      return reply.code(400).send({ error: 'missing_kind_or_name' })
    }
    if (!isSafeFileName(name) && !isSafeRelativePath(name)) {
      return reply.code(400).send({ error: 'invalid_name' })
    }

    const buffer = await data.toBuffer()

    try {
      if (kind === 'radio-mp3') {
        const dir = clientMp3Dir(clientId)
        await mkdir(dir, { recursive: true })
        await writeFile(join(dir, name), buffer)
      } else if (kind === 'radio-jingle') {
        const dir = clientJinglesDir(clientId)
        await mkdir(dir, { recursive: true })
        await writeFile(join(dir, name), buffer)
      } else if (kind === 'radio-cover') {
        // name = "<trackId>.jpg" o "<jingleId>.jpg"
        const dir = clientCoversDir(clientId)
        await mkdir(dir, { recursive: true })
        await writeFile(join(dir, name), buffer)
      } else if (kind === 'video-file') {
        // name = "user_<clientId>/<filename>"
        const tmp = join(tmpdir(), `migrate_${Date.now()}_${Math.random().toString(36).slice(2)}`)
        writeFileSync(tmp, buffer)
        try {
          const dir = VIDEO_DIR + '/' + name.split('/').slice(0, -1).join('/')
          await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p '${dir}'`)
          await execCmd(`docker cp '${tmp}' '${ENCODER_CONTAINER}:${VIDEO_DIR}/${name}'`)
        } finally {
          unlinkSync(tmp)
        }
      } else if (kind === 'video-thumbnail') {
        // name = "<basename>.jpg"; path = thumbnails/<clientId>/<name>
        const tmp = join(tmpdir(), `migrate_thumb_${Date.now()}`)
        writeFileSync(tmp, buffer)
        try {
          const dir = `${VIDEO_DIR}/thumbnails/${clientId}`
          await execCmd(`docker exec ${ENCODER_CONTAINER} mkdir -p '${dir}'`)
          await execCmd(`docker cp '${tmp}' '${ENCODER_CONTAINER}:${dir}/${name}'`)
        } finally {
          unlinkSync(tmp)
        }
      } else {
        return reply.code(400).send({ error: 'invalid_kind' })
      }

      return { ok: true, kind, name }
    } catch (err) {
      logger.error({ err, clientId, kind, name }, 'Migration import failed')
      return reply.code(500).send({ error: 'import_failed', message: err.message })
    }
  })

  /**
   * POST /api/migrate/:clientId/cleanup
   * body: { files: [{ kind, name }] } — borra archivos SIN tocar la DB.
   */
  app.post('/api/migrate/:clientId/cleanup', async (request, reply) => {
    const { clientId } = request.params
    const files = request.body?.files
    if (!Array.isArray(files)) {
      return reply.code(400).send({ error: 'invalid_files' })
    }

    let removed = 0
    try {
      for (const f of files) {
        const { kind, name } = f
        if (!isSafeFileName(name) && !isSafeRelativePath(name)) continue
        try {
          if (kind === 'radio-mp3') {
            await unlink(join(clientMp3Dir(clientId), name)).catch(() => {})
            removed++
          } else if (kind === 'radio-jingle') {
            await unlink(join(clientJinglesDir(clientId), name)).catch(() => {})
            removed++
          } else if (kind === 'radio-cover') {
            await unlink(join(clientCoversDir(clientId), name)).catch(() => {})
            removed++
          } else if (kind === 'video-file') {
            await execCmd(`docker exec ${ENCODER_CONTAINER} rm -f '${VIDEO_DIR}/${name}' || true`)
            removed++
          } else if (kind === 'video-thumbnail') {
            await execCmd(`docker exec ${ENCODER_CONTAINER} rm -f '${VIDEO_DIR}/thumbnails/${clientId}/${name}' || true`)
            removed++
          }
        } catch {}
      }
      return { ok: true, removed }
    } catch (err) {
      return reply.code(500).send({ error: 'cleanup_failed', message: err.message })
    }
  })

  /**
   * GET /api/migrate/:clientId/files — lista archivos del cliente (para verificar).
   * Radio: mp3, jingles, covers (filesystem local).
   * Video: user files + thumbnails (docker exec en el encoder).
   */
  app.get('/api/migrate/:clientId/files', async (request, reply) => {
    const { clientId } = request.params

    let radioMp3 = []
    let radioJingles = []
    let radioCovers = []
    try {
      const mp3Dir = clientMp3Dir(clientId)
      radioMp3 = existsSync(mp3Dir) ? await readdir(mp3Dir) : []
      const jDir = clientJinglesDir(clientId)
      radioJingles = existsSync(jDir) ? await readdir(jDir) : []
      const cDir = clientCoversDir(clientId)
      radioCovers = existsSync(cDir) ? await readdir(cDir) : []
    } catch {}

    let videoFiles = []
    let videoThumbs = []
    try {
      const out = await execCmd(`docker exec ${ENCODER_CONTAINER} sh -c 'ls ${VIDEO_DIR}/user_${clientId} 2>/dev/null || echo ""'`)
      videoFiles = out.split('\n').map((s) => s.trim()).filter(Boolean)
      const tOut = await execCmd(`docker exec ${ENCODER_CONTAINER} sh -c 'ls ${VIDEO_DIR}/thumbnails/${clientId} 2>/dev/null || echo ""'`)
      videoThumbs = tOut.split('\n').map((s) => s.trim()).filter(Boolean)
    } catch {}

    return {
      clientId,
      radioMp3,
      radioJingles,
      radioCovers,
      videoFiles,
      videoThumbs,
    }
  })

  /**
   * GET /api/migrate/:clientId/video-track/:trackId/raw — sirve el video crudo
   * (para copiar entre servidores). Lee filepath desde la DB.
   */
  app.get('/api/migrate/:clientId/video-track/:trackId/raw', async (request, reply) => {
    const { clientId, trackId } = request.params
    const [rows] = await pool.query(
      `SELECT filepath FROM video_tracks WHERE id = ? AND clientId = ?`,
      [trackId, clientId]
    )
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'not_found' })
    }
    const filepath = rows[0].filepath
    if (!isSafeRelativePath(filepath)) {
      return reply.code(400).send({ error: 'invalid_filepath' })
    }
    try {
      const buf = await execBuffer(`docker exec ${ENCODER_CONTAINER} cat '${VIDEO_DIR}/${filepath}'`)
      reply.header('Content-Type', 'video/mp4')
      reply.header('Content-Length', String(buf.length))
      return reply.send(buf)
    } catch (err) {
      logger.error({ err, clientId, trackId }, 'video raw read failed')
      return reply.code(404).send({ error: 'file_not_found' })
    }
  })
}
