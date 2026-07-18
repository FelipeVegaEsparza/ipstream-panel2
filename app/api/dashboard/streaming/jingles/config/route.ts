import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const result = await streamingClient.getJingleConfig(ctx.clientId)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/jingles/config GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const body = await request.json()
    const { jinglePlayEvery, jinglePlayCount } = body
    if (typeof jinglePlayEvery !== 'number' || typeof jinglePlayCount !== 'number') {
      return NextResponse.json({
        error: 'invalid_input',
        message: 'jinglePlayEvery y jinglePlayCount son requeridos (números)',
      }, { status: 400 })
    }
    const result = await streamingClient.updateJingleConfig(ctx.clientId, jinglePlayEvery, jinglePlayCount)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({ error: 'agent_error', message: err.message }, { status: 502 })
    }
    console.error('[streaming/jingles/config PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
