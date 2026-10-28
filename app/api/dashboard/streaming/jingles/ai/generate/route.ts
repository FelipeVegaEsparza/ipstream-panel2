import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { generateJingle, JINGLE_DURATIONS } from '@/lib/jingle-ai'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const tagline = typeof body?.tagline === 'string' ? body.tagline.trim().slice(0, 300) : ''
    const duration = Number(body?.duration)
    if (!tagline) {
      return NextResponse.json({ error: 'tagline_required', message: 'Escribí la locución del jingle.' }, { status: 400 })
    }
    if (!JINGLE_DURATIONS.includes(duration as 10 | 15)) {
      return NextResponse.json({ error: 'invalid_duration', message: 'Duración inválida.' }, { status: 400 })
    }

    const [tts, stream] = await Promise.all([
      getAiLiveAccess(ctx.clientId),
      prisma.radioStream.findUnique({
        where: { clientId: ctx.clientId },
        select: {
          jingleMusicTrack: {
            select: { id: true, name: true, url: true, active: true },
          },
        },
      }),
    ])
    const track = stream?.jingleMusicTrack
    if (!track?.active) {
      return NextResponse.json(
        { error: 'music_required', message: 'Elegí una pista de música para el jingle.' },
        { status: 400 }
      )
    }
    if (!tts.enabled || tts.remaining < tagline.length) {
      return NextResponse.json(
        { error: 'tts_quota_exceeded', message: `Te quedan ${tts.remaining} caracteres de locución.` },
        { status: 402 }
      )
    }

    const storedName = path.basename(track.url)
    const musicPath = path.join(process.cwd(), 'public', 'uploads', 'music', storedName)
    let music: Buffer
    try {
      music = await fs.readFile(musicPath)
    } catch {
      return NextResponse.json(
        { error: 'music_file_missing', message: 'No se encontró el archivo de música elegido.' },
        { status: 500 }
      )
    }

    const result = await generateJingle({
      clientId: ctx.clientId,
      duration,
      tagline,
      music,
    })

    if (!result.ttsCached) {
      try {
        await consumeAiCharacters(ctx.clientId, result.ttsCharacters, 'ai-jingle')
      } catch (err) {
        console.error('[jingles/ai/generate] no se pudo registrar TTS:', err)
      }
    }

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-AI-Remaining': String(Math.max(0, tts.remaining - (result.ttsCached ? 0 : tagline.length))),
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[jingles/ai/generate]', err)
    return NextResponse.json(
      { error: 'generate_failed', message: err instanceof Error ? err.message : 'No se pudo generar el jingle.' },
      { status: 502 }
    )
  }
}
