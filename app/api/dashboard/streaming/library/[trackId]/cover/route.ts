import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return new NextResponse(null, { status: 404 })
    }

    const agentRes = await streamingClient.getCover(ctx.clientId, params.trackId)

    if (!agentRes.ok) {
      if (agentRes.status === 404) {
        return new NextResponse(null, { status: 404 })
      }
      return new NextResponse(null, { status: agentRes.status })
    }

    const contentType = agentRes.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await agentRes.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[cover GET]', err)
    return new NextResponse(null, { status: 500 })
  }
}
