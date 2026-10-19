// =====================================================
// Configuración del Locutor IA (vivo + AutoDJ + frases)
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess } from '@/lib/ai-live'
import { DEFAULT_PRESENTER_PHRASES, normalizePhrases } from '@/lib/live-console/presenter'

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
  const [rs, access, client] = await Promise.all([
    prisma.radioStream.findUnique({
      where: { clientId },
      select: { aiPresenterEnabled: true, aiPresenterEvery: true, aiIntroPhrases: true, aiTimeEveryMinutes: true, aiWeatherEveryMinutes: true },
    }),
    getAiLiveAccess(clientId),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { name: true, basicData: { select: { projectName: true } } },
    }),
  ])
  if (!rs) return null
  return {
    enabled: rs.aiPresenterEnabled,
    every: rs.aiPresenterEvery,
    phrases: parsePhrases(rs.aiIntroPhrases),
    timeEveryMinutes: rs.aiTimeEveryMinutes,
    weatherEveryMinutes: rs.aiWeatherEveryMinutes,
    aiEnabled: access.enabled,
    remaining: access.remaining,
    limit: access.limit,
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

    await prisma.radioStream.update({
      where: { clientId: ctx.clientId },
      data: {
        aiPresenterEnabled: enabled,
        aiPresenterEvery: every,
        aiIntroPhrases: JSON.stringify(phrases),
        aiTimeEveryMinutes: timeEveryMinutes,
        aiWeatherEveryMinutes: weatherEveryMinutes,
      },
    })

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
