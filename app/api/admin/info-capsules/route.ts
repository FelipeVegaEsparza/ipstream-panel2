import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const execFileAsync = promisify(execFile)
const MAX_SIZE = 50 * 1024 * 1024
const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav',
  'audio/ogg': '.ogg', 'audio/oga': '.oga', 'audio/opus': '.opus', 'audio/mp4': '.m4a',
  'audio/aac': '.aac', 'audio/flac': '.flac', 'audio/x-flac': '.flac', 'audio/webm': '.webm',
}
const EXT_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.oga': 'audio/ogg',
  '.opus': 'audio/opus', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.webm': 'audio/webm',
}

async function admin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const capsules = await prisma.infoCapsule.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { id: true, name: true } }, _count: { select: { clients: true } } },
  })
  return NextResponse.json({ capsules })
}

export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  let filePath: string | null = null
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file_required' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'file_too_large' }, { status: 413 })
    const originalName = (typeof file.name === 'string' ? file.name : 'capsula.mp3').slice(0, 190)
    const ext = path.extname(originalName).toLowerCase()
    const type = typeof file.type === 'string' ? file.type.toLowerCase() : ''
    const mimeType = AUDIO_TYPES[type] || EXT_TYPES[ext]
    const resolvedExt = AUDIO_TYPES[type] || ext
    if (!mimeType || !EXT_TYPES[resolvedExt]) {
      return NextResponse.json({ error: 'invalid_type' }, { status: 415 })
    }
    const title = String(form.get('title') || path.basename(originalName, path.extname(originalName))).trim().slice(0, 191)
    if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 })
    const description = String(form.get('description') || '').trim().slice(0, 2000) || null
    const categoryIdRaw = form.get('categoryId')
    const categoryId = typeof categoryIdRaw === 'string' && categoryIdRaw ? categoryIdRaw : null
    const storedName = `${crypto.randomUUID()}${resolvedExt}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'info-capsules')
    await fs.mkdir(dir, { recursive: true })
    filePath = path.join(dir, storedName)
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()))
    let duration: number | null = null
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
      ], { timeout: 15_000 })
      const seconds = Number(String(stdout).trim())
      if (Number.isFinite(seconds) && seconds > 0) duration = Math.round(seconds)
    } catch {}
    const capsule = await prisma.infoCapsule.create({
      data: {
        title,
        description,
        categoryId,
        fileName: originalName,
        mimeType,
        url: `/api/uploads/info-capsules/${storedName}`,
        size: file.size,
        duration,
      },
      include: { category: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ capsule }, { status: 201 })
  } catch (err) {
    if (filePath) await fs.unlink(filePath).catch(() => {})
    console.error('[info-capsules POST]', err)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }
}
