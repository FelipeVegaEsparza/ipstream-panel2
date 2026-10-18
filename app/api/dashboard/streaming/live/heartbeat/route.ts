// =====================================================
// /api/dashboard/streaming/live/heartbeat
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { liveAgentRequest, LiveAgentError } from '@/lib/live-agent'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id_required' }, { status: 400 })
    }

    const result = await liveAgentRequest<{ ok: boolean; state?: string }>(
      ctx.clientId,
      '/api/live/session/heartbeat',
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, clientId: ctx.clientId, end: Boolean(body?.end) }),
      }
    )
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof LiveAgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[live/heartbeat]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
