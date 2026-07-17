// =====================================================
// /api/dashboard/streaming/control — start/stop/restart
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    // Phase 7: kill switch — si el admin deshabilitó, no dejar operar
    const enabled = (await prisma.radioStream.findUnique({
      where: { clientId: ctx.clientId },
      select: { enabled: true },
    }))?.enabled
    if (enabled === false) {
      return NextResponse.json({
        error: 'streaming_disabled',
        message: 'Tu streaming fue deshabilitado por el administrador. Contacta soporte.',
      }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const action = body?.action

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json({
        error: 'invalid_action',
        message: 'action debe ser "start", "stop" o "restart"',
      }, { status: 400 })
    }

    let result
    if (action === 'start') result = await streamingClient.start(ctx.clientId)
    else if (action === 'stop') result = await streamingClient.stop(ctx.clientId)
    else result = await streamingClient.restart(ctx.clientId)

    return NextResponse.json({ ok: true, action, ...result })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({
        error: 'agent_error',
        message: err.message,
        status: err.status,
      }, { status: 502 })
    }
    console.error('[streaming/control]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
