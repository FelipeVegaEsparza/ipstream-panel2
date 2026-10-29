import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    let trackIds: string[] | undefined
    try {
      const body = await request.json()
      if (Array.isArray(body?.trackIds)) {
        const ids = body.trackIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
        if (ids.length > 0) trackIds = ids
      }
    } catch {
      // Body opcional: sin body se normaliza toda la biblioteca.
    }

    const result = await streamingClient.normalizeTitles(ctx.clientId, trackIds)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/library/normalize POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
