// =====================================================
// /api/dashboard/streaming/ai/reviews/:id/audio
// Devuelve el audio de una reseña para escucharla en el panel.
// Si el audio no está cacheado, se sintetiza y consume cuota.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getAiLiveAccess, consumeAiCharacters } from '@/lib/ai-live'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'
import { synthesizeReviewWithLimit, buildReviewSpeech, getClientStationName } from '@/lib/ai-reviews'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const review = await prisma.aiReview.findFirst({
      where: { id: params.id, clientId: ctx.clientId },
      select: { text: true },
    })
    if (!review) {
      return NextResponse.json({ error: 'review_not_found' }, { status: 404 })
    }

    const access = await getAiLiveAccess(ctx.clientId)
    if (!access.enabled) {
      return NextResponse.json({ error: 'ai_not_included' }, { status: 403 })
    }
    if (!(await hasConfiguredPremiumTts())) {
      return NextResponse.json(
        { error: 'tts_not_configured', message: 'Configurá ElevenLabs o Fish Audio en Locución.' },
        { status: 503 }
      )
    }

    const station = await getClientStationName(ctx.clientId)
    const result = await synthesizeReviewWithLimit({
      clientId: ctx.clientId,
      text: buildReviewSpeech(station, review.text),
    })
    if (!result) {
      return NextResponse.json(
        { error: 'review_audio_too_long', message: 'La reseña supera el tope de 20 segundos.' },
        { status: 422 }
      )
    }

    if (!result.cached) {
      if (result.text.length > access.remaining) {
        return NextResponse.json(
          {
            error: 'ai_quota_exceeded',
            message: `La reseña necesita ${result.text.length} caracteres y te quedan ${access.remaining}.`,
          },
          { status: 402 }
        )
      }
      try {
        await consumeAiCharacters(ctx.clientId, result.text.length, 'ai-review')
      } catch (err) {
        console.error('[ai/reviews audio] no se pudo registrar la cuota:', err)
      }
    }

    return new Response(new Uint8Array(result.audio), {
      status: 200,
      headers: {
        'Content-Type': result.contentType || 'audio/mpeg',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/reviews audio]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
