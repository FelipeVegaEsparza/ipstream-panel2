import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    if (!Array.isArray(body.trackIds) || body.trackIds.length === 0) {
      return NextResponse.json({ error: 'validation_error', details: 'trackIds array required' }, { status: 400 })
    }
    const result = await streamingClient.addTracksToPlaylist(ctx.clientId, params.id, body.trackIds)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/playlist add tracks bulk]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
