import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
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

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const [tracks, stream] = await Promise.all([
      prisma.musicTrack.findMany({
        where: {
          active: true,
          OR: [{ clientId: null }, { clientId: ctx.clientId }],
        },
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true, name: true, artist: true, url: true,
          duration: true, size: true, mimeType: true,
        },
      }),
      prisma.radioStream.findUnique({
        where: { clientId: ctx.clientId },
        select: {
          jingleMusicTrackId: true,
          jingleMusicTrack: { select: { id: true, active: true } },
        },
      }),
    ])
    const selectedId =
      stream?.jingleMusicTrack?.active ? stream.jingleMusicTrack.id : null
    return NextResponse.json({ tracks, selectedId })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/music GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const body = await request.json().catch(() => ({}))
    const raw = body?.musicTrackId
    const musicTrackId = raw === null || raw === '' ? null : typeof raw === 'string' ? raw : undefined
    if (musicTrackId === undefined) {
      return NextResponse.json({ error: 'invalid_music_track' }, { status: 400 })
    }
    if (musicTrackId) {
      const track = await prisma.musicTrack.findFirst({
        where: {
          id: musicTrackId,
          active: true,
          OR: [{ clientId: null }, { clientId: ctx.clientId }],
        },
        select: { id: true },
      })
      if (!track) return NextResponse.json({ error: 'invalid_music_track' }, { status: 400 })
    }
    await prisma.radioStream.update({
      where: { clientId: ctx.clientId },
      data: { jingleMusicTrackId: musicTrackId },
      select: { id: true },
    })
    return NextResponse.json({ selectedId: musicTrackId })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/music PUT]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let filePath: string | null = null
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file_required', message: 'Elegí un archivo de audio.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'file_too_large', message: 'El archivo supera los 50 MB.' },
        { status: 413 }
      )
    }

    const originalName = (typeof file.name === 'string' ? file.name : 'musica.mp3').slice(0, 180)
    const ext = path.extname(originalName).toLowerCase()
    const fileType = (typeof file.type === 'string' ? file.type : '').toLowerCase()
    const resolvedExt = AUDIO_TYPES[fileType] || ext
    const normalizedExt = resolvedExt === '.oga' ? '.ogg' : resolvedExt
    const mimeType = EXT_TYPES[normalizedExt] || fileType
    if (!mimeType || !EXT_TYPES[normalizedExt]) {
      return NextResponse.json(
        { error: 'invalid_type', message: 'Formato de audio no soportado.' },
        { status: 415 }
      )
    }

    const rawName = form.get('name')
    const name = (
      typeof rawName === 'string' && rawName.trim()
        ? rawName.trim()
        : path.basename(originalName, path.extname(originalName))
    ).slice(0, 120)

    const storedName = `client-${ctx.clientId}-${crypto.randomUUID()}${normalizedExt}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'music')
    await fs.mkdir(dir, { recursive: true })
    filePath = path.join(dir, storedName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)
    const duration = await probeAudioDuration(filePath)

    const track = await prisma.musicTrack.create({
      data: {
        clientId: ctx.clientId,
        name,
        artist: null,
        fileName: originalName,
        mimeType,
        url: `/api/uploads/music/${storedName}`,
        size: file.size,
        duration,
        active: true,
      },
      select: {
        id: true,
        name: true,
        artist: true,
        url: true,
        duration: true,
        size: true,
        mimeType: true,
      },
    })

    await prisma.radioStream.update({
      where: { clientId: ctx.clientId },
      data: { jingleMusicTrackId: track.id },
      select: { id: true },
    })

    return NextResponse.json({ track, selectedId: track.id }, { status: 201 })
  } catch (err) {
    if (filePath) await fs.unlink(filePath).catch(() => {})
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/music POST]', err)
    return NextResponse.json({ error: 'upload_failed', message: 'No se pudo subir la música.' }, { status: 500 })
  }
}
