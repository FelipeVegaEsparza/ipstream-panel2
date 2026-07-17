// =====================================================
// /api/dashboard/streaming/playlists/[id]/tracks/[trackId] — DELETE
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; trackId: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const result = await streamingClient.removeTrackFromPlaylist(ctx.clientId, params.id, params.trackId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/playlist remove track]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
