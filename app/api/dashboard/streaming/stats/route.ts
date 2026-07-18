import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const period = req.nextUrl.searchParams.get('period') || 'day'
    const from = req.nextUrl.searchParams.get('from') || undefined
    const to = req.nextUrl.searchParams.get('to') || undefined
    const result = await streamingClient.listStats(ctx.clientId, { period, from, to } as any)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/stats GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
