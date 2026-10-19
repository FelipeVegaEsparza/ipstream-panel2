import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { getAiMusicAccess, consumeAiMusicSeconds } from '@/lib/ai-music'
import { generateJingle, JINGLE_DURATIONS } from '@/lib/jingle-ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, 600) : ''
    const tagline = typeof body?.tagline === 'string' ? body.tagline.trim().slice(0, 300) : ''
    const duration = Number(body?.duration)
    if (!prompt) {
      return NextResponse.json({ error: 'prompt_required', message: 'Describí el estilo de la música.' }, { status: 400 })
    }
    if (!tagline) {
      return NextResponse.json({ error: 'tagline_required', message: 'Escribí la locución del jingle.' }, { status: 400 })
    }
    if (!JINGLE_DURATIONS.includes(duration as 10 | 15)) {
      return NextResponse.json({ error: 'invalid_duration', message: 'Duración inválida.' }, { status: 400 })
    }

    const [music, tts] = await Promise.all([
      getAiMusicAccess(ctx.clientId),
      getAiLiveAccess(ctx.clientId),
    ])
    if (!music.enabled) {
      return NextResponse.json(
        { error: 'music_not_included', message: 'Tu plan no incluye minutos de música IA.' },
        { status: 403 }
      )
    }
    if (music.remainingSeconds < duration) {
      return NextResponse.json(
        { error: 'music_quota_exceeded', message: `Te quedan ${music.remainingSeconds} segundos de música IA.` },
        { status: 402 }
      )
    }
    if (!tts.enabled || tts.remaining < tagline.length) {
      return NextResponse.json(
        { error: 'tts_quota_exceeded', message: `Te quedan ${tts.remaining} caracteres de locución.` },
        { status: 402 }
      )
    }

    const result = await generateJingle({
      clientId: ctx.clientId,
      prompt,
      duration,
      tagline,
    })

    await consumeAiMusicSeconds(ctx.clientId, duration)
    if (!result.ttsCached) {
      try {
        await consumeAiCharacters(ctx.clientId, result.ttsCharacters)
      } catch (err) {
        console.error('[jingles/ai/generate] no se pudo registrar TTS:', err)
      }
    }

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Music-Remaining': String(Math.max(0, music.remainingSeconds - duration)),
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
