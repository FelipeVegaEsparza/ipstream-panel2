// =====================================================
// /api/dashboard/streaming/specials/:id/audio
// POST = grabar y subir al agente; GET = escuchar en el panel.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import {
  getClientStationName,
  synthesizeSpecialSpeech,
  type SpecialPart,
  type SpecialSpeech,
} from '@/lib/specials'

export const dynamic = 'force-dynamic'

function parsePart(value: unknown): SpecialPart | null {
  return value === 'intro' || value === 'closing' ? value : null
}

async function loadSpecial(clientId: string, id: string) {
  return prisma.radioSpecial.findFirst({
    where: { id, clientId },
    select: { id: true, introText: true, closingText: true },
  })
}

async function buildAudio(
  clientId: string,
  special: { id: string; introText: string; closingText: string },
  part: SpecialPart
): Promise<{ speech: SpecialSpeech; station: string; text: string } | { error: string; status: number; message: string }> {
  const access = await getAiLiveAccess(clientId)
  if (!access.enabled) {
    return { error: 'ai_not_included', status: 403, message: 'Tu plan no incluye IA.' }
  }
  if (!(await hasConfiguredPremiumTts())) {
    return {
      error: 'tts_not_configured',
      status: 503,
      message: 'Configurá ElevenLabs o Fish Audio en Locución.',
    }
  }

  const text = part === 'intro' ? special.introText : special.closingText
  if (!text.trim()) {
    return { error: 'missing_text', status: 400, message: 'Falta el texto de esta parte.' }
  }

  const station = await getClientStationName(clientId)
  const speech = await synthesizeSpecialSpeech({
    clientId,
    station,
    text,
    part,
  })
  if (!speech) {
    return {
      error: 'audio_too_long',
      status: 422,
      message: 'El audio supera los 20 segundos. Acortá el texto e intentá de nuevo.',
    }
  }

  if (!speech.cached) {
    if (speech.text.length > access.remaining) {
      return {
        error: 'ai_quota_exceeded',
        status: 402,
        message: `El audio necesita ${speech.text.length} caracteres y te quedan ${access.remaining}.`,
      }
    }
    try {
      await consumeAiCharacters(clientId, speech.text.length, 'ai-special')
    } catch (err) {
      console.error('[specials audio] no se pudo registrar la cuota:', err)
    }
  }

  return { speech, station, text: speech.text }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const part = parsePart(body?.part)
    if (!part) {
      return NextResponse.json({ error: 'invalid_part', message: 'part debe ser intro o closing.' }, { status: 400 })
    }

    const special = await loadSpecial(ctx.clientId, params.id)
    if (!special) return NextResponse.json({ error: 'special_not_found' }, { status: 404 })

    const result = await buildAudio(ctx.clientId, special, part)
    if ('error' in result) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: result.status })
    }

    const file = new File(
      [new Uint8Array(result.speech.audio)],
      `${part}.mp3`,
      { type: result.speech.contentType || 'audio/mpeg' }
    )
    try {
      await streamingClient.uploadSpecialAudio(ctx.clientId, special.id, part, file)
    } catch (err) {
      if (err instanceof StreamingAgentError) {
        return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
      }
      throw err
    }

    const readyAt = new Date()
    await prisma.radioSpecial.update({
      where: { id: special.id },
      data: {
        ...(part === 'intro'
          ? { introText: result.text, introReadyAt: readyAt }
          : { closingText: result.text, closingReadyAt: readyAt }),
      },
    })

    return NextResponse.json({
      ok: true,
      part,
      text: result.text,
      seconds: result.speech.seconds,
      cached: result.speech.cached,
      trimmed: result.text !== (part === 'intro' ? special.introText : special.closingText),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials audio POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })

    const part = parsePart(request.nextUrl.searchParams.get('part'))
    if (!part) {
      return NextResponse.json({ error: 'invalid_part', message: 'part debe ser intro o closing.' }, { status: 400 })
    }
    const special = await loadSpecial(ctx.clientId, params.id)
    if (!special) return NextResponse.json({ error: 'special_not_found' }, { status: 404 })

    const result = await buildAudio(ctx.clientId, special, part)
    if ('error' in result) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: result.status })
    }

    return new Response(new Uint8Array(result.speech.audio), {
      status: 200,
      headers: {
        'Content-Type': result.speech.contentType || 'audio/mpeg',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[specials audio GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
