// =====================================================
// /api/dashboard/streaming/djs/[djId]/kick — desconectar DJ
// =====================================================
// Autorización: admins o el cliente dueño de la radio.

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function POST(_request: NextRequest, { params }: { params: { djId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const res = await streamingClient.kickDj(ctx.clientId, params.djId)
    return NextResponse.json(res)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: err.status || 502 })
    }
    console.error('[djs kick]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
