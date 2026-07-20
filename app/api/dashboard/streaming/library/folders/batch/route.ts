import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient } from '@/lib/streaming-client'

// POST /api/dashboard/streaming/library/folders/batch/move
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const body = await request.json()
    if (body.action === 'move') {
      const data = await streamingClient.batchMoveTracks(ctx.clientId, body.trackIds, body.folderId ?? null)
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[folders batch]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
