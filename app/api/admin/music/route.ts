import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { probeAudioDuration } from '@/lib/audio-mix'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 50 * 1024 * 1024
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
  const tracks = await prisma.musicTrack.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      artist: true,
      fileName: true,
      mimeType: true,
      url: true,
      size: true,
      duration: true,
      active: true,
      createdAt: true,
      _count: { select: { radioStreams: true } },
    },
  })
  return NextResponse.json({ tracks })
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
      return NextResponse.json({ error: 'file_too_large', message: 'Máximo 50 MB' }, { status: 413 })
    }
    const originalName = (typeof file.name === 'string' ? file.name : 'musica.mp3').slice(0, 180)
    const ext = path.extname(originalName).toLowerCase()
    const fileType = (typeof file.type === 'string' ? file.type : '').toLowerCase()
    const mimeType = AUDIO_TYPES[fileType] || EXT_TYPES[ext]
    const resolvedExt = AUDIO_TYPES[fileType] || ext
    const normalizedExt = resolvedExt === '.oga' ? '.ogg' : resolvedExt
    if (!mimeType || !EXT_TYPES[normalizedExt]) {
      return NextResponse.json({ error: 'invalid_type', message: 'Formato de audio no soportado' }, { status: 415 })
    }
    const rawName = form.get('name')
    const rawArtist = form.get('artist')
    const name = (typeof rawName === 'string' && rawName.trim()
      ? rawName.trim()
      : path.basename(originalName, path.extname(originalName))).slice(0, 120)
    const artist = (typeof rawArtist === 'string' ? rawArtist.trim().slice(0, 120) : '') || null
    const storedName = `${crypto.randomUUID()}${normalizedExt}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'music')
    await fs.mkdir(dir, { recursive: true })
    filePath = path.join(dir, storedName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)
    const duration = await probeAudioDuration(filePath)
    const track = await prisma.musicTrack.create({
      data: {
        name,
        artist,
        fileName: originalName,
        mimeType,
        url: `/api/uploads/music/${storedName}`,
        size: file.size,
        duration,
      },
      select: {
        id: true,
        name: true,
        artist: true,
        fileName: true,
        mimeType: true,
        url: true,
        size: true,
        duration: true,
        active: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ track }, { status: 201 })
  } catch (err) {
    if (filePath) await fs.unlink(filePath).catch(() => {})
    console.error('[admin/music POST]', err)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }
}
