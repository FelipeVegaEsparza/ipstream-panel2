import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getFishAudioConfig } from '@/lib/fish-audio-config'
import { synthesizeFishAudio } from '@/lib/fish-audio-tts'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const config = await getFishAudioConfig()
    if (!config.enabled || !config.apiKey) {
      return NextResponse.json(
        { error: 'fish_not_configured', message: 'Fish Audio no está configurado.' },
        { status: 503 }
      )
    }

    const requested = (request.nextUrl.searchParams.get('voiceId') || '').trim()
    const voice = requested
      ? config.voices.find((item) => item.id === requested)
      : null
    if (requested && !voice) {
      return NextResponse.json({ error: 'voice_not_found' }, { status: 404 })
    }
    const referenceId = voice?.referenceId || config.referenceId
    if (!referenceId) {
      return NextResponse.json(
        { error: 'voice_not_configured', message: 'No hay una voz Fish configurada.' },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: ctx.clientId },
      select: { name: true, basicData: { select: { projectName: true } } },
    })
    const station = client?.basicData?.projectName || client?.name || 'la radio'
    const text = `Hola, soy la voz de ${station}. Así sonará tu emisora.`

    const result = await synthesizeFishAudio({
      text,
      apiKey: config.apiKey,
      model: config.model,
      referenceId,
      direction: config.direction || FISH_AUDIO_DIRECTIONS.presenter,
      stationName: station,
      closingDirection: FISH_AUDIO_DIRECTIONS.presenterClosing,
      cacheEnabled: config.cacheEnabled,
    })

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-TTS-Cached': result.cached ? '1' : '0',
        'X-Voice-Id': voice?.id || 'default',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[voice-preview]', err)
    return NextResponse.json(
      { error: 'preview_failed', message: err instanceof Error ? err.message : 'No se pudo generar la muestra.' },
      { status: 502 }
    )
  }
}
