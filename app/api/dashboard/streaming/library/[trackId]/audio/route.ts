import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'

const AGENT_URL = process.env.STREAMING_AGENT_URL || 'http://agent:4000'
const AGENT_TOKEN = process.env.STREAMING_AGENT_TOKEN || ''

export async function GET(_request: NextRequest, { params }: { params: { trackId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return new NextResponse(null, { status: 404 })
    }

    const agentRes = await fetch(
      `${AGENT_URL}/api/streams/${encodeURIComponent(ctx.clientId)}/library/${encodeURIComponent(params.trackId)}/audio`,
      {
        headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!agentRes.ok) {
      // Loggear para diagnóstico en producción; el browser verá un 502 con detalle.
      let detail = ''
      try { detail = (await agentRes.text()).slice(0, 200) } catch {}
      console.error(`[streaming/library/audio] agent ${agentRes.status} for track ${params.trackId}: ${detail}`)
      return new NextResponse(
        JSON.stringify({
          error: 'agent_error',
          status: agentRes.status,
          detail,
          message: agentRes.status === 404
            ? 'El archivo no está disponible en el servidor de streaming. Reintentá subirlo.'
            : 'El servidor de streaming no respondió correctamente.',
        }),
        { status: agentRes.status === 404 ? 404 : 502, headers: { 'Content-Type': 'application/json' } }
      )
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
    console.error('[streaming/library/audio GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
