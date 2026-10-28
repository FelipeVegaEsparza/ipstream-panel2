import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const [tracks, stream] = await Promise.all([
      prisma.musicTrack.findMany({
        where: { active: true },
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
        where: { id: musicTrackId, active: true },
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
