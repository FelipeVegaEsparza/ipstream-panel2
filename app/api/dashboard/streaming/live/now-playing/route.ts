// =====================================================
// /api/dashboard/streaming/live/now-playing
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { liveAgentRequest, LiveAgentError } from '@/lib/live-agent'

export const dynamic = 'force-dynamic'

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 300) : null
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id_required' }, { status: 400 })
    }

    const result = await liveAgentRequest<{ ok: boolean }>(
      ctx.clientId,
      '/api/live/session/now-playing',
      {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          clientId: ctx.clientId,
          title: clean(body?.title),
          artist: clean(body?.artist),
          nextTitle: clean(body?.nextTitle),
          nextArtist: clean(body?.nextArtist),
        }),
      }
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof LiveAgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[live/now-playing]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
