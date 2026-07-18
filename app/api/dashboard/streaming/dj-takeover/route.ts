// =====================================================
// /api/dashboard/streaming/dj-takeover — toma de control DJ
// Llama al agente para kickear AutoDJ y liberar el mount.
// =====================================================

import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError, getAgentClient } from '@/lib/streaming-auth'

export async function POST() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const agent = getAgentClient()
    const res = await agent.post(`/api/streams/${ctx.clientId}/dj-takeover`)
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'dj_takeover_failed', message: data.message }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[dj-takeover]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
