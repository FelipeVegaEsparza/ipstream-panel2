// =====================================================
// /api/dashboard/streaming/ai/reviews/:id — activar/desactivar una reseña
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { setReviewActive } from '@/lib/ai-reviews'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    if (typeof body?.active !== 'boolean') {
      return NextResponse.json(
        { error: 'invalid_active', message: 'Indicá si la reseña queda activa o desactivada.' },
        { status: 400 }
      )
    }

    const updated = await setReviewActive(ctx.clientId, params.id, body.active)
    if (!updated) {
      return NextResponse.json({ error: 'review_not_found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id: params.id, active: body.active })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[ai/reviews PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
