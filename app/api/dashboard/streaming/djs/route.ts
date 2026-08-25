// =====================================================
// /api/dashboard/streaming/djs — CRUD de slots de DJ
// Proxea al agente.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { resolveRadioServerTarget } from '@/lib/streaming-servers'

async function resolveTarget(ctx: { clientId: string; hasRadioStream: boolean }) {
  if (!ctx.hasRadioStream) {
    return null
  }
  return resolveRadioServerTarget(ctx.clientId)
}

export async function GET() {
  try {
    const ctx = await requireStreamingClient()
    const target = await resolveTarget(ctx)
    if (!target) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const res = await fetch(
      `${target.baseUrl}/api/streams/${encodeURIComponent(ctx.clientId)}/djs`,
      { headers: { Authorization: `Bearer ${target.token}` } }
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'agent_error' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[djs GET]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const target = await resolveTarget(ctx)
    if (!target) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const body = await request.json()

    const res = await fetch(
      `${target.baseUrl}/api/streams/${encodeURIComponent(ctx.clientId)}/djs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${target.token}`,
        },
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
    console.error('[djs POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
