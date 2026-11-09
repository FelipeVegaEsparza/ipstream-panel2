import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { generateJingle, JINGLE_DURATIONS, type JingleDuration } from '@/lib/jingle-ai'
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
    if (!JINGLE_DURATIONS.includes(duration as JingleDuration)) {
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

    const style = typeof body?.style === 'string' ? body.style : undefined
    const intensity = Number(body?.intensity)
    const voiceFx = body?.voiceFx !== false
    const sfx = body?.sfx && typeof body.sfx === 'object' ? body.sfx : {}
    const voice = body?.voice && typeof body.voice === 'object' ? body.voice : {}
    const numberOrUndefined = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    const stringOrUndefined = (value: unknown) =>
      typeof value === 'string' ? value : undefined

    const result = await generateJingle({
      clientId: ctx.clientId,
      duration,
      tagline,
      music,
      style,
      intensity: Number.isFinite(intensity) ? intensity : undefined,
      voiceFx,
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
        'X-AI-Remaining': String(Math.max(0, tts.remaining - (result.ttsCached ? 0 : result.ttsCharacters))),
        'X-Jingle-Duration': String(result.duration),
        'X-Jingle-Style': result.style,
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
