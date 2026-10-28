// =====================================================
// /api/dashboard/streaming/live/tts
// Locución libre / presentador IA. Valida plan y cuota mensual.
// Usa el proveedor premium elegido (ElevenLabs o Fish Audio); si falla, cae a Piper.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { resolveRadioServerTarget } from '@/lib/streaming-servers'
import { synthesizePremiumTts } from '@/lib/premium-tts'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { FISH_AUDIO_DIRECTIONS } from '@/lib/fish-audio-directions'

export const dynamic = 'force-dynamic'

const MAX_CHARS = 500

interface AudioResult {
  audio: Buffer
  contentType: string
  provider: 'elevenlabs' | 'fish' | 'piper'
  cached: boolean
  remaining: number
}

async function piperTts(clientId: string, text: string): Promise<AudioResult> {
  const target = await resolveRadioServerTarget(clientId)
  if (!target) {
    throw new Error('No hay servidor de streaming configurado.')
  }
  const res = await fetch(`${target.baseUrl}/api/live/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${target.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, voice: 'male' }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    let message = 'No se pudo generar la locución.'
    try {
      const data = await res.json()
      message = data?.message || data?.error || message
    } catch {}
    throw new Error(message)
  }
  return {
    audio: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') || 'audio/wav',
    provider: 'piper',
    cached: false,
    remaining: -1,
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const body = await request.json().catch(() => ({}))
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : ''
    if (!text) {
      return NextResponse.json({ error: 'text_required', message: 'Escribí un texto.' }, { status: 400 })
    }

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json(
        { error: 'ai_not_included', message: 'Tu plan no incluye IA en vivo.' },
        { status: 403 }
      )
    }
    if (text.length > access.remaining) {
      return NextResponse.json(
        {
          error: 'ai_quota_exceeded',
          message: `Cuota de IA agotada. Te quedan ${access.remaining} caracteres este mes.`,
        },
        { status: 402 }
      )
    }

    let result: AudioResult | null = null

    try {
      const premium = await synthesizePremiumTts({
        clientId: ctx.clientId,
        text,
        direction: FISH_AUDIO_DIRECTIONS.presenter,
      })
      if (!premium.cached) {
        try {
          await consumeAiCharacters(ctx.clientId, text.length, 'live-locution')
        } catch (err) {
          console.error('[live/tts] no se pudo registrar la cuota:', err)
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
      console.error('[live/tts] voz premium falló; usando Piper:', err)
    }

    if (!result) {
      try {
        result = await piperTts(ctx.clientId, text)
        result.remaining = access.remaining
      } catch (err) {
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
    console.error('[live/tts]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
