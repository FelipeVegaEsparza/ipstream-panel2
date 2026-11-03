// =====================================================
// /api/dashboard/streaming/ai/reviews/:id/regenerate
// Pide un texto nuevo a DeepSeek y reemplaza el anterior.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { getClientReviewConfig, regenerateReview } from '@/lib/ai-reviews'
import { isDeepSeekConfigured } from '@/lib/deepseek'
import { hasConfiguredPremiumTts } from '@/lib/premium-tts'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const config = await getClientReviewConfig(ctx.clientId)
    if (!config?.adminEnabled) {
      return NextResponse.json(
        { error: 'reviews_disabled_by_admin', message: 'El administrador desactivó las reseñas para esta radio.' },
        { status: 403 }
      )
    }
    if (!(await isDeepSeekConfigured())) {
      return NextResponse.json(
        { error: 'ai_unavailable', message: 'La generación de reseñas no está configurada en el panel.' },
        { status: 503 }
      )
    }
    if (!(await hasConfiguredPremiumTts())) {
      return NextResponse.json(
        { error: 'tts_unavailable', message: 'Falta configurar una voz premium para las reseñas.' },
        { status: 503 }
      )
    }

    const review = await regenerateReview(ctx.clientId, params.id)
    if (!review) {
      return NextResponse.json(
        { error: 'review_generation_failed', message: 'No se pudo generar una reseña nueva para este tema.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      review: {
        id: review.id,
        kind: review.kind,
        artist: review.artist,
        title: review.title,
        style: review.style,
        text: review.text,
        active: review.active,
        updatedAt: review.updatedAt,
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/reviews regenerate]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
