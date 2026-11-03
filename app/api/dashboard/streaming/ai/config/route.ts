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
import { DEFAULT_REVIEW_STYLE, isReviewStyle } from '@/lib/ai-reviews'
import { isDeepSeekConfigured } from '@/lib/deepseek'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'

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
  const [rs, access, client, elevenVoices, provider, eleven, fish, premiumTts] = await Promise.all([
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
        aiReviewEveryTracks: true,
        aiReviewStyle: true,
        aiReviewAdminEnabled: true,
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
    hasConfiguredPremiumTts(),
  ])
  if (!rs) return null
  const deepseekAvailable = await isDeepSeekConfigured()
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
    reviewsEnabled: rs.aiReviewAdminEnabled && rs.aiReviewEveryTracks > 0,
    reviewEvery: rs.aiReviewEveryTracks,
    reviewStyle: isReviewStyle(rs.aiReviewStyle) ? rs.aiReviewStyle : DEFAULT_REVIEW_STYLE,
    reviewAdminEnabled: rs.aiReviewAdminEnabled,
    reviewsAvailable: deepseekAvailable && premiumTts,
    reviewsUnavailableReason: !deepseekAvailable
      ? 'ai'
      : !premiumTts
        ? 'tts'
        : null,
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

    const hasReviewConfig =
      body &&
      typeof body === 'object' &&
      ('reviewsEnabled' in body || 'reviewEvery' in body || 'reviewStyle' in body)

    let reviewEvery = 0
    let reviewStyle = DEFAULT_REVIEW_STYLE
    if (hasReviewConfig) {
      const reviewsEnabled = Boolean(body.reviewsEnabled)
      const rawEvery = Number(body.reviewEvery ?? 0)
      if (!Number.isInteger(rawEvery) || rawEvery < 0 || rawEvery > 20) {
        return NextResponse.json(
          { error: 'invalid_review_every', message: 'La frecuencia de reseñas debe ser un entero entre 0 y 20 temas.' },
          { status: 400 }
        )
      }
      if (reviewsEnabled && rawEvery < 2) {
        return NextResponse.json(
          { error: 'invalid_review_every', message: 'Para activar las reseñas la frecuencia debe ser entre 2 y 20 temas.' },
          { status: 400 }
        )
      }
      const rawStyle = typeof body.reviewStyle === 'string' ? body.reviewStyle.trim() : ''
      if (rawStyle && !isReviewStyle(rawStyle)) {
        return NextResponse.json(
          { error: 'invalid_review_style', message: 'El estilo de reseña elegido no existe.' },
          { status: 400 }
        )
      }
      reviewEvery = reviewsEnabled ? rawEvery : 0
      reviewStyle = isReviewStyle(rawStyle) ? rawStyle : DEFAULT_REVIEW_STYLE

      const adminConfig = await prisma.radioStream.findUnique({
        where: { clientId: ctx.clientId },
        select: { aiReviewAdminEnabled: true },
      })
      if (adminConfig && !adminConfig.aiReviewAdminEnabled && (reviewsEnabled || rawEvery > 0)) {
        return NextResponse.json(
          { error: 'reviews_disabled_by_admin', message: 'El administrador desactivó las reseñas para esta radio.' },
          { status: 403 }
        )
      }
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
      select: { aiPresenterEnabled: true, aiReviewEveryTracks: true },
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
        ...(hasReviewConfig
          ? {
              aiReviewEveryTracks: reviewEvery,
              aiReviewStyle: reviewStyle,
            }
          : {}),
      },
    })

    const clearIntros = Boolean(previous?.aiPresenterEnabled) && !enabled
    const clearReviews =
      hasReviewConfig && (previous?.aiReviewEveryTracks ?? 0) > 0 && reviewEvery === 0

    if (clearIntros || clearReviews) {
      try {
        if (clearIntros) await streamingClient.clearAiIntros(ctx.clientId)
        if (clearReviews) await streamingClient.clearAiReviews(ctx.clientId)
        await streamingClient.restart(ctx.clientId)
      } catch (err) {
        console.warn('[ai/config] no se pudieron limpiar las locuciones del AutoDJ', err)
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
