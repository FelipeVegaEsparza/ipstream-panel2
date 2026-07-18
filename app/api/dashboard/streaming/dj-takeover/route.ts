import { NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'

const AGENT_URL = process.env.STREAMING_AGENT_URL || 'http://agent:4000'
const AGENT_TOKEN = process.env.STREAMING_AGENT_TOKEN || ''

export async function POST() {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const res = await fetch(
      `${AGENT_URL}/api/streams/${encodeURIComponent(ctx.clientId)}/dj-takeover`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
        signal: AbortSignal.timeout(15000),
      }
    )
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'dj_takeover_failed', message: data.message }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[dj-takeover]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
