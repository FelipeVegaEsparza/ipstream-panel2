// =====================================================
// /api/dashboard/streaming/history — proxy al agente
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '25'

    const result = await streamingClient.getHistory(ctx.clientId, Number(page), Number(limit))
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({
        error: 'agent_error',
        message: err.message,
        status: err.status,
      }, { status: 502 })
    }
    console.error('[streaming/history]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
