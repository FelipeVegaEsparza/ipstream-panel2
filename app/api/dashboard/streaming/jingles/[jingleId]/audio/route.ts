import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { resolveRadioServerTarget } from '@/lib/streaming-servers'

export async function GET(_request: NextRequest, { params }: { params: { jingleId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return new NextResponse(null, { status: 404 })
    }

    const target = await resolveRadioServerTarget(ctx.clientId)
    if (!target) {
      return new NextResponse(
        JSON.stringify({ error: 'no_streaming_server', message: 'No hay servidor de streaming configurado' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const agentRes = await fetch(
      `${target.baseUrl}/api/streams/${encodeURIComponent(ctx.clientId)}/jingles/${encodeURIComponent(params.jingleId)}/audio`,
      {
        headers: { Authorization: `Bearer ${target.token}` },
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!agentRes.ok) {
      return new NextResponse(null, { status: agentRes.status })
    }

    const blob = await agentRes.blob()
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'audio/mpeg',
        'Content-Length': blob.size.toString(),
      },
    })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[streaming/jingles/audio GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
