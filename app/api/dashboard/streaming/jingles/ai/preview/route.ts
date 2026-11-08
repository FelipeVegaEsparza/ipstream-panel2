import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { previewJingle } from '@/lib/jingle-fx'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DURATIONS = [10, 15]

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const duration = Number(body?.duration)
    if (!DURATIONS.includes(duration)) {
      return NextResponse.json({ error: 'invalid_duration' }, { status: 400 })
    }

    const stream = await prisma.radioStream.findUnique({
      where: { clientId: ctx.clientId },
      select: {
        jingleMusicTrack: { select: { name: true, url: true, active: true } },
      },
    })
    const track = stream?.jingleMusicTrack
    if (!track?.active) {
      return NextResponse.json({ error: 'music_required', message: 'Elegí una pista de música.' }, { status: 400 })
    }

    let music: Buffer
    try {
      music = await fs.readFile(
        path.join(process.cwd(), 'public', 'uploads', 'music', path.basename(track.url))
      )
    } catch {
      return NextResponse.json({ error: 'music_file_missing' }, { status: 500 })
    }

    const sfx = body?.sfx && typeof body.sfx === 'object' ? body.sfx : {}
    const voice = body?.voice && typeof body.voice === 'object' ? body.voice : {}
    const numberOrUndefined = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    const stringOrUndefined = (value: unknown) =>
      typeof value === 'string' ? value : undefined

    const result = await previewJingle({
      music,
      requestedDuration: duration,
      style: stringOrUndefined(body?.style),
      intensity: numberOrUndefined(body?.intensity),
      overrides: {
        introSfx: stringOrUndefined(sfx.intro),
        impactSfx: stringOrUndefined(sfx.impact),
        transitionSfx: stringOrUndefined(sfx.transition),
        outroSfx: stringOrUndefined(sfx.outro),
        voiceCharacter: stringOrUndefined(voice.character),
        pitchSemitones: numberOrUndefined(voice.pitchSemitones),
        speed: numberOrUndefined(voice.speed),
        reverb: numberOrUndefined(voice.reverb),
        doubling: numberOrUndefined(voice.doubling),
      },
    })

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Jingle-Duration': String(result.duration),
        'X-Jingle-Style': result.style,
        'X-Jingle-Preview': '1',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/ai/preview]', err)
    return NextResponse.json(
      { error: 'preview_failed', message: 'No se pudo armar el preview.' },
      { status: 502 }
    )
  }
}
