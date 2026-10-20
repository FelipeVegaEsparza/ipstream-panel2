import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 20 * 1024 * 1024
const AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/ogg': '.ogg',
  'audio/opus': '.opus',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/webm': '.webm',
}
const EXT_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/opus',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
}

async function requireAdmin() {
  const session = await getSession()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const effects = await prisma.soundEffect.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, fileName: true, mimeType: true,
      url: true, size: true, active: true, createdAt: true,
      _count: { select: { clients: true } },
    },
  })
  return NextResponse.json({ effects })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  let filePath: string | null = null
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file_required' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'file_too_large', message: 'Máximo 20 MB' }, { status: 413 })
    }
    const originalName = (typeof file.name === 'string' ? file.name : 'efecto.mp3').slice(0, 180)
    const ext = path.extname(originalName).toLowerCase()
    const mimeType = AUDIO_TYPES[(typeof file.type === 'string' ? file.type : '').toLowerCase()] || EXT_TYPES[ext]
    const resolvedExt = AUDIO_TYPES[(typeof file.type === 'string' ? file.type : '').toLowerCase()] || ext
    if (!mimeType || !EXT_TYPES[resolvedExt === '.oga' ? '.ogg' : resolvedExt]) {
      return NextResponse.json({ error: 'invalid_type', message: 'Formato de audio no soportado' }, { status: 415 })
    }
    const rawName = form.get('name')
    const name = (typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : path.basename(originalName, path.extname(originalName))).slice(0, 120)
    const storedName = `${crypto.randomUUID()}${resolvedExt === '.oga' ? '.ogg' : resolvedExt}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'sound-effects')
    await fs.mkdir(dir, { recursive: true })
    filePath = path.join(dir, storedName)
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()))
    const effect = await prisma.soundEffect.create({
      data: {
        name,
        fileName: originalName,
        mimeType,
        url: `/api/uploads/sound-effects/${storedName}`,
        size: file.size,
      },
      select: { id: true, name: true, fileName: true, mimeType: true, url: true, size: true, createdAt: true },
    })
    return NextResponse.json({ effect }, { status: 201 })
  } catch (err) {
    if (filePath) await fs.unlink(filePath).catch(() => {})
    console.error('[admin/sound-effects POST]', err)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }
}
