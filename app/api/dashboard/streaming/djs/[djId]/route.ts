// =====================================================
// /api/dashboard/streaming/djs/[djId] — PATCH/DELETE DJ
// Proxea al agente.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'

const AGENT_URL = process.env.STREAMING_AGENT_URL || 'http://agent:4000'
const AGENT_TOKEN = process.env.STREAMING_AGENT_TOKEN || ''

function agentHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AGENT_TOKEN}`,
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { djId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json()
    const res = await fetch(
      `${AGENT_URL}/api/streams/${encodeURIComponent(ctx.clientId)}/djs/${params.djId}`,
      {
        method: 'PATCH',
        headers: agentHeaders(),
        body: JSON.stringify(body),
      }
    )
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[djs PATCH]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { djId: string } }) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const res = await fetch(
      `${AGENT_URL}/api/streams/${encodeURIComponent(ctx.clientId)}/djs/${params.djId}`,
      {
        method: 'DELETE',
        headers: agentHeaders(),
      }
    )
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[djs DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
