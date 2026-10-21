// =====================================================
// /api/dashboard/streaming/live/announce
// Genera la locución de clima u hora y devuelve el audio TTS.
// Usa el proveedor premium elegido (ElevenLabs o Fish Audio); si falla, cae a Piper.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { resolveRadioServerTarget } from '@/lib/streaming-servers'
import { weatherPhrase } from '@/lib/weather-label'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'

export const dynamic = 'force-dynamic'

type RequestedVoice = 'premium' | 'male' | 'female'
type PiperVoice = 'male' | 'female'

interface AudioResult {
  audio: Buffer
  contentType: string
  provider: 'elevenlabs' | 'fish' | 'piper'
  cached: boolean
  remaining: number
}

class NoServerError extends Error {}

function currentTimeText(timeZone: string): string {
  let zone = timeZone || 'UTC'
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
  } catch {
    zone = 'UTC'
    parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date())
  }

  const rawHour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const hour = rawHour === 24 ? 0 : rawHour
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  return minute === 0
    ? `Son las ${hour} horas en punto.`
    : `Son las ${hour} horas con ${minute} minutos.`
}

async function weatherText(clientId: string): Promise<string> {
  const basic = await prisma.basicData.findUnique({
    where: { clientId },
    select: { city: true, country: true, latitude: true, longitude: true },
  })

  if (!basic?.city || basic.latitude == null || basic.longitude == null) {
    throw new Error('no_location')
  }

  const unit = basic.country === 'US' ? 'fahrenheit' : 'celsius'
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(basic.latitude))
  url.searchParams.set('longitude', String(basic.longitude))
  url.searchParams.set('current_weather', 'true')
  url.searchParams.set('temperature_unit', unit)

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('weather_unavailable')
  const data = await res.json()
  const current = data?.current_weather
  if (!current || typeof current.temperature !== 'number') {
    throw new Error('weather_unavailable')
  }

  const unitLabel = unit === 'fahrenheit' ? 'Fahrenheit' : 'Celsius'
  const condition = weatherPhrase(
    typeof current.weathercode === 'number' ? current.weathercode : null
  )
  return `En ${basic.city}, la temperatura actual es de ${Math.round(current.temperature)} grados ${unitLabel}, con ${condition}.`
}

async function piperTts(clientId: string, text: string, voice: PiperVoice): Promise<AudioResult> {
  const target = await resolveRadioServerTarget(clientId)
  if (!target) throw new NoServerError()

  const ttsRes = await fetch(`${target.baseUrl}/api/live/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${target.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice }),
    signal: AbortSignal.timeout(30000),
  })

  if (!ttsRes.ok) {
    let message = 'No se pudo generar la locución con Piper.'
    try {
      const data = await ttsRes.json()
      message = data?.message || data?.error || message
    } catch {}
    throw new Error(message)
  }

  return {
    audio: Buffer.from(await ttsRes.arrayBuffer()),
    contentType: ttsRes.headers.get('content-type') || 'audio/wav',
    provider: 'piper',
    cached: false,
    remaining: 0,
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const body = await request.json().catch(() => ({}))
    const type = body?.type
    const requestedVoice: RequestedVoice =
      body?.voice === 'premium' || body?.voice === 'female' ? body.voice : 'male'

    if (type !== 'weather' && type !== 'time') {
      return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
    }

    let text: string
    if (type === 'time') {
      const client = await prisma.client.findUnique({
        where: { id: ctx.clientId },
        select: { timezone: true },
      })
      text = currentTimeText(client?.timezone || 'UTC')
    } else {
      try {
        text = await weatherText(ctx.clientId)
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        if (message === 'no_location') {
          return NextResponse.json(
            { error: 'no_location', message: 'Configurá tu ciudad en Datos Básicos.' },
            { status: 400 }
          )
        }
        return NextResponse.json(
          { error: 'weather_unavailable', message: 'No se pudo obtener el clima.' },
          { status: 502 }
        )
      }
    }

    let result: AudioResult | null = null
    const access = await getAiLiveAccess(ctx.clientId)
    const premiumAllowed = access.enabled && text.length <= access.remaining

    if (requestedVoice === 'premium' && premiumAllowed) {
      try {
        const premium = await synthesizePremiumTts({ clientId: ctx.clientId, text })
        if (!premium.cached) {
          try {
            await consumeAiCharacters(ctx.clientId, text.length)
          } catch (err) {
            console.error('[live/announce] no se pudo registrar la cuota:', err)
          }
        }
        result = {
          audio: premium.audio,
          contentType: premium.contentType,
          provider: premium.provider,
          cached: premium.cached,
          remaining: Math.max(0, access.remaining - (premium.cached ? 0 : text.length)),
        }
      } catch (err) {
        console.error('[live/announce] voz premium falló; usando Piper:', err)
      }
    }

    if (!result) {
      try {
        result = await piperTts(
          ctx.clientId,
          text,
          requestedVoice === 'female' ? 'female' : 'male'
        )
        result.remaining = access.remaining
      } catch (err) {
        if (err instanceof NoServerError) {
          return NextResponse.json(
            { error: 'no_streaming_server', message: 'No hay servidor de streaming configurado.' },
            { status: 503 }
          )
        }
        return NextResponse.json(
          {
            error: 'tts_failed',
            message: err instanceof Error ? err.message : 'No se pudo generar la locución.',
          },
          { status: 502 }
        )
      }
    }

    return new NextResponse(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'no-store',
        'X-TTS-Provider': result.provider,
        'X-TTS-Cached': result.cached ? '1' : '0',
        'X-AI-Remaining': String(result.remaining),
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[live/announce]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
