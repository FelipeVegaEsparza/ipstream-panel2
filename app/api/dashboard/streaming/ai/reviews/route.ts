// =====================================================
// /api/dashboard/streaming/ai/reviews — banco de reseñas de la radio
// =====================================================

import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { listClientReviews } from '@/lib/ai-reviews'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const reviews = await listClientReviews(ctx.clientId)
    return NextResponse.json({
      reviews: reviews.map((review) => ({
        id: review.id,
        kind: review.kind,
        artist: review.artist,
        title: review.title,
        style: review.style,
        text: review.text,
        active: review.active,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/reviews GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
