// =====================================================
// Configuración del Locutor IA (vivo + AutoDJ + frases)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess } from '@/lib/ai-live'
import { DEFAULT_PRESENTER_PHRASES, normalizePhrases } from '@/lib/live-console/presenter'
import { getVoiceCatalog } from '@/lib/elevenlabs-voices'
import { streamingClient } from '@/lib/streaming-client'
import { getTtsProvider } from '@/lib/tts-provider'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'
import { getFishAudioConfig } from '@/lib/fish-audio-config'
import { isTtsQualityPresetId, resolveTtsQuality } from '@/lib/tts-quality'

export const dynamic = 'force-dynamic'

const MAX_PHRASES = 20
const MAX_PHRASE_LENGTH = 240

function parsePhrases(raw: string | null | undefined): string[] {
  if (!raw) return DEFAULT_PRESENTER_PHRASES
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_PRESENTER_PHRASES
    return normalizePhrases(parsed.filter((value): value is string => typeof value === 'string'))
  } catch {
    return DEFAULT_PRESENTER_PHRASES
  }
}

async function loadConfig(clientId: string) {
  const [rs, access, client, elevenVoices, provider, eleven, fish] = await Promise.all([
    prisma.radioStream.findUnique({
      where: { clientId },
      select: {
        aiPresenterEnabled: true,
        aiPresenterEvery: true,
        aiIntroPhrases: true,
        aiTimeEveryMinutes: true,
        aiWeatherEveryMinutes: true,
        aiVoiceId: true,
        fishVoiceId: true,
        aiVoiceStyle: true,
        aiVoicePreset: true,
      },
    }),
    getAiLiveAccess(clientId),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, basicData: { select: { projectName: true } } },
    }),
    getVoiceCatalog(),
    getTtsProvider(),
    getElevenLabsConfig(),
    getFishAudioConfig(),
  ])
  if (!rs) return null
  const voices = provider === 'fish'
    ? fish.voices.map((voice) => ({
        id: voice.id,
        name: voice.name,
        gender: voice.gender,
        description: voice.gender === 'female' ? 'Femenina' : 'Masculina',
      }))
    : elevenVoices
  return {
    enabled: rs.aiPresenterEnabled,
    every: rs.aiPresenterEvery,
    phrases: parsePhrases(rs.aiIntroPhrases),
    timeEveryMinutes: rs.aiTimeEveryMinutes,
    weatherEveryMinutes: rs.aiWeatherEveryMinutes,
    voiceId: provider === 'fish' ? (rs.fishVoiceId || '') : (rs.aiVoiceId || ''),
    voiceStyle: rs.aiVoiceStyle,
    voicePreset: rs.aiVoicePreset || '',
    globalVoicePreset: eleven.qualityPreset,
    effectiveVoicePreset: resolveTtsQuality({
      globalPreset: eleven.qualityPreset,
      clientPreset: rs.aiVoicePreset,
      clientStyle: rs.aiVoiceStyle,
    }).presetId,
    voices,
    provider,
    aiEnabled: access.enabled,
    remaining: access.remaining,
    limit: access.limit,
    used: access.used,
    period: access.period,
    stationName: client?.basicData?.projectName || client?.name || 'la radio',
  }
}

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    const config = await loadConfig(ctx.clientId)
    if (!config) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    return NextResponse.json(config)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/config GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json(
        { error: 'ai_not_included', message: 'Tu plan no incluye IA en vivo.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const enabled = Boolean(body?.enabled)
    const every = Number(body?.every)
    if (!Number.isInteger(every) || every < 2 || every > 10) {
      return NextResponse.json(
        { error: 'invalid_every', message: 'La frecuencia debe ser un entero entre 2 y 10.' },
        { status: 400 }
      )
    }

    const voiceId = typeof body?.voiceId === 'string' ? body.voiceId.trim().slice(0, 191) : ''
    const voicePreset = typeof body?.voicePreset === 'string' ? body.voicePreset.trim() : ''
    if (voicePreset && !isTtsQualityPresetId(voicePreset)) {
      return NextResponse.json(
        { error: 'invalid_voice_preset', message: 'Preset de calidad inválido.' },
        { status: 400 }
      )
    }
    const voiceStyle = Number(body?.voiceStyle)
    if (!Number.isInteger(voiceStyle) || voiceStyle < 0 || voiceStyle > 100) {
      return NextResponse.json(
        { error: 'invalid_voice_style', message: 'La expresividad debe ser un entero entre 0 y 100.' },
        { status: 400 }
      )
    }

    const timeEveryMinutes = Number(body?.timeEveryMinutes)
    const weatherEveryMinutes = Number(body?.weatherEveryMinutes)
    if (
      !Number.isInteger(timeEveryMinutes) || timeEveryMinutes < 0 || timeEveryMinutes > 1440 ||
      !Number.isInteger(weatherEveryMinutes) || weatherEveryMinutes < 0 || weatherEveryMinutes > 1440
    ) {
      return NextResponse.json(
        { error: 'invalid_intervals', message: 'Los intervalos deben ser enteros entre 0 y 1440 minutos.' },
        { status: 400 }
      )
    }

    const rawPhrases = Array.isArray(body?.phrases) ? body.phrases : []
    const phrases = normalizePhrases(
      rawPhrases
        .filter((value: unknown): value is string => typeof value === 'string')
        .map((value: string) => value.trim().slice(0, MAX_PHRASE_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_PHRASES)
    )

    const provider = await getTtsProvider()
    if (provider === 'fish' && voiceId) {
      const fish = await getFishAudioConfig()
      if (!fish.voices.some((voice) => voice.id === voiceId)) {
        return NextResponse.json(
          { error: 'invalid_voice', message: 'La voz Fish elegida no existe.' },
          { status: 400 }
        )
      }
    }
    if (provider === 'elevenlabs' && voiceId) {
      const catalog = await getVoiceCatalog()
      if (!catalog.some((voice) => voice.id === voiceId)) {
        return NextResponse.json(
          { error: 'invalid_voice', message: 'La voz ElevenLabs elegida no existe.' },
          { status: 400 }
        )
      }
    }

    const previous = await prisma.radioStream.findUnique({
      where: { clientId: ctx.clientId },
      select: { aiPresenterEnabled: true },
    })
    await prisma.radioStream.update({
      where: { clientId: ctx.clientId },
      data: {
        aiPresenterEnabled: enabled,
        aiPresenterEvery: every,
        aiIntroPhrases: JSON.stringify(phrases),
        aiTimeEveryMinutes: timeEveryMinutes,
        aiWeatherEveryMinutes: weatherEveryMinutes,
        ...(provider === 'fish'
          ? { fishVoiceId: voiceId || null }
          : { aiVoiceId: voiceId || null }),
        aiVoiceStyle: voiceStyle,
        aiVoicePreset: voicePreset || null,
      },
    })

    if (previous?.aiPresenterEnabled && !enabled) {
      try {
        await streamingClient.clearAiIntros(ctx.clientId)
        await streamingClient.restart(ctx.clientId)
      } catch (err) {
        console.warn('[ai/config] no se pudieron quitar las intros del AutoDJ', err)
      }
    }

    const config = await loadConfig(ctx.clientId)
    return NextResponse.json({
      ...config,
      message: enabled
        ? 'Locutor IA guardado. El vivo lo aplica al refrescar; el AutoDJ al pulsar Aplicar.'
        : 'Locutor IA desactivado.',
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/config PUT]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
