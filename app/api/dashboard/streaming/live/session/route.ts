// =====================================================
// /api/dashboard/streaming/live/session
// Crea y termina sesiones de la consola web de radio.
// =====================================================

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { prisma } from '@/lib/prisma'
import { getDisabledMenuItems } from '@/lib/menu-permissions'
import { resolveRadioServerTarget } from '@/lib/streaming-servers'
import { signLiveToken } from '@/lib/live-token'
import { liveAgentRequest, LiveAgentError } from '@/lib/live-agent'

export const dynamic = 'force-dynamic'

const ROLE_ORDER: Record<string, number> = { owner: 0, host: 1, guest: 2 }

function publicBaseUrl(target: {
  id?: string
  publicUrl?: string | null
  publicHostname: string
}): string {
  if (process.env.LIVE_PUBLIC_BASE_URL) {
    return process.env.LIVE_PUBLIC_BASE_URL.replace(/\/+$/, '')
  }
  // En el target legacy `publicUrl` apunta a Icecast, no al agente.
  if (target.id !== '__env__' && target.publicUrl) {
    return target.publicUrl.replace(/\/+$/, '')
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/+$/, '')
  }
  return `https://${target.publicHostname}`.replace(/\/+$/, '')
}

function iceServers(): RTCIceServer[] {
  const raw = process.env.LIVE_ICE_SERVERS
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function defaultTransport(): 'whip' | 'websocket' {
  return process.env.LIVE_TRANSPORT_DEFAULT === 'websocket' ? 'websocket' : 'whip'
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    const disabled = await getDisabledMenuItems(ctx.clientId)
    if (disabled.has('streaming-live')) {
      return NextResponse.json({ error: 'live_console_disabled' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedTransport = body?.transport
    const transport: 'whip' | 'websocket' =
      requestedTransport === 'websocket'
        ? 'websocket'
        : requestedTransport === 'whip'
          ? 'whip'
          : defaultTransport()

    const [radio, djs] = await Promise.all([
      prisma.radioStream.findUnique({
        where: { clientId: ctx.clientId },
        select: { bitrate: true, serverId: true, icecastMount: true },
      }),
      prisma.radioDj.findMany({
        where: { clientId: ctx.clientId, isActive: true },
        select: { id: true, name: true, mount: true, role: true, priority: true },
      }),
    ])

    const sorted = [...djs].sort((a, b) => {
      const roleDiff = (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2)
      return roleDiff !== 0 ? roleDiff : a.priority - b.priority
    })

    let slot = null as (typeof sorted)[number] | null
    if (body?.slotId) {
      slot = sorted.find((item) => item.id === body.slotId) ?? null
      if (!slot) {
        return NextResponse.json({ error: 'slot_not_found' }, { status: 404 })
      }
    } else {
      slot = sorted[0] ?? null
    }

    const target = await resolveRadioServerTarget(ctx.clientId)
    if (!target) {
      return NextResponse.json({ error: 'no_streaming_server' }, { status: 503 })
    }

    const mount = slot?.mount ?? '/live'

    // Un slot ya conectado (DJ externo u otra consola) no se puede tomar.
    try {
      const harbor = await liveAgentRequest<{ djSlots?: Array<{ mount?: string; connected?: boolean }> }>(
        ctx.clientId,
        `/api/streams/${encodeURIComponent(ctx.clientId)}/harbor/status`
      )
      if (Array.isArray(harbor.djSlots) && harbor.djSlots.some((item) => item.mount === mount && item.connected)) {
        return NextResponse.json({ error: 'slot_busy', message: 'El slot ya está conectado' }, { status: 409 })
      }
    } catch {
      // Si el agente no responde, el inicio fallará con un error más específico.
    }

    const base = publicBaseUrl(target)
    const sessionId = crypto.randomUUID()
    const slotName = slot?.name ?? 'DJ en vivo'
    // Si no hay secreto explícito, firmamos con el token del servidor destino:
    // el agente usa ese mismo token como fallback. Así funciona multi-nodo.
    const signingSecret = process.env.LIVE_SESSION_SECRET || target.token
    const { token, expiresAt } = signLiveToken({
      sid: sessionId,
      cid: ctx.clientId,
      slotId: slot?.id ?? null,
      mount,
      transport,
    }, 120, signingSecret)

    const whipUrl = transport === 'whip'
      ? `${base}/rtc/v1/whip?app=radio&stream=${encodeURIComponent(sessionId)}`
      : null
    const wsUrl = transport === 'websocket'
      ? `${base.replace(/^http/i, 'ws')}/ws/live`
      : null

    return NextResponse.json({
      sessionId,
      token,
      transport,
      whipUrl,
      wsUrl,
      slotId: slot?.id ?? null,
      slotName,
      mount,
      bitrate: 192,
      streamBitrate: radio?.bitrate ?? 128,
      expiresAt,
      iceServers: iceServers(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[live/session POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id_required' }, { status: 400 })
    }
    await liveAgentRequest(ctx.clientId, '/api/live/session/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId, clientId: ctx.clientId }),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof LiveAgentError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[live/session DELETE]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
