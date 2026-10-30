import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getFishAudioConfig } from '@/lib/fish-audio-config'
import { synthesizeFishAudio } from '@/lib/fish-audio-tts'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { getClientVoiceSettings, getVoiceCatalog } from '@/lib/elevenlabs-voices'
import { synthesizeElevenLabs } from '@/lib/elevenlabs-tts'
import { getTtsProvider } from '@/lib/tts-provider'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const provider = await getTtsProvider()
    const requested = (request.nextUrl.searchParams.get('voiceId') || '').trim()

    const client = await prisma.client.findUnique({
      where: { id: ctx.clientId },
      select: { name: true, basicData: { select: { projectName: true } } },
    })
    const station = client?.basicData?.projectName || client?.name || 'la radio'
    const text = `Hola, soy la voz de ${station}. Así sonará tu emisora.`

    if (provider === 'elevenlabs') {
      const config = await getElevenLabsConfig()
      if (!config.enabled || !config.apiKey) {
        return NextResponse.json(
          { error: 'elevenlabs_not_configured', message: 'ElevenLabs no está configurado.' },
          { status: 503 }
        )
      }
      const catalog = await getVoiceCatalog()
      if (requested && !catalog.some((voice) => voice.id === requested)) {
        return NextResponse.json({ error: 'voice_not_found' }, { status: 404 })
      }
      const settings = await getClientVoiceSettings(ctx.clientId)
      const voiceId = requested || config.voiceId || settings.voiceId
      if (!voiceId) {
        return NextResponse.json(
          { error: 'voice_not_configured', message: 'No hay una voz ElevenLabs configurada.' },
          { status: 400 }
        )
      }
      const result = await synthesizeElevenLabs({
        text,
        apiKey: config.apiKey,
        voiceId,
        model: config.model,
        cacheEnabled: config.cacheEnabled,
        style: settings.style / 100,
        legacyStyle: settings.style / 100,
        quality: settings.quality,
        pronunciationDictionaryId: config.pronunciationDictionaryId,
        pronunciationDictionaryVersionId: config.pronunciationDictionaryVersionId,
      })
      return new NextResponse(new Uint8Array(result.audio), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
          'X-TTS-Cached': result.cached ? '1' : '0',
          'X-Voice-Id': voiceId,
          'X-TTS-Provider': 'elevenlabs',
        },
      })
    }

    const config = await getFishAudioConfig()
    if (!config.enabled || !config.apiKey) {
      return NextResponse.json(
        { error: 'fish_not_configured', message: 'Fish Audio no está configurado.' },
        { status: 503 }
      )
    }

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
        'X-TTS-Provider': 'fish',
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
