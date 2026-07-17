// =====================================================
// /api/dashboard/streaming/status — Estado del stream del cliente
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()

    if (!ctx.hasRadioStream) {
      return NextResponse.json({
        hasRadioStream: false,
        message: 'Este cliente no tiene un RadioStream configurado',
      }, { status: 404 })
    }

    const status = await streamingClient.getStatus(ctx.clientId)
    const icePublicUrl = process.env.ICE_PUBLIC_URL || 'http://localhost:8000'

    return NextResponse.json({
      hasRadioStream: true,
      clientId: ctx.clientId,
      mount: ctx.icecastMount,
      streamUrl: `${icePublicUrl}/${ctx.icecastMount}`,
      ...status,
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({
        error: 'agent_error',
        message: err.message,
        status: err.status,
      }, { status: err.status === 404 ? 404 : 502 })
    }
    console.error('[streaming/status]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
