// =====================================================
// /api/dashboard/streaming/connection — datos de DJ
// =====================================================
// Devuelve la info de conexión (servidor, mount) y, bajo demanda,
// el livePassword (con audit).

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { revealLivePassword, revealSourcePassword } from '@/lib/streaming-helpers'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    // Obtener harbor port + DJ slots desde el agente
    let harborPort: number | null = null
    let djConnected = false
    let djSlots: any[] = []
    try {
      const harborRes = await fetch(
        `${process.env.STREAMING_AGENT_URL || 'http://agent:4000'}/api/streams/${encodeURIComponent(ctx.clientId)}/harbor/status`,
        { headers: { Authorization: `Bearer ${process.env.STREAMING_AGENT_TOKEN || ''}` } }
      )
      if (harborRes.ok) {
        const harborData = await harborRes.json()
        harborPort = harborData.harborPort
        djConnected = harborData.djConnected
        djSlots = harborData.djSlots || []
      }
    } catch {
      // agent not reachable
    }

    // Datos públicos de conexión (sin password)
    const iceHost = process.env.ICE_PUBLIC_HOSTNAME || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '').split(':')[0] || 'localhost'
    const data = {
      clientId: ctx.clientId,
      mount: ctx.icecastMount,
      host: iceHost,
      port: parseInt(process.env.ICE_PUBLIC_PORT || '8000', 10),
      harborHost: process.env.HARBOR_PUBLIC_HOSTNAME || iceHost,
      harborPort,
      harborMount: '/live',
      djConnected,
      djSlots,
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[streaming/connection]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * POST /api/dashboard/streaming/connection
 * Body: { revealPassword: 'live' | 'source' }
 * Devuelve el password solicitado. Audita el acceso.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    const session = await getEffectiveClient()
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const which = body?.revealPassword

    if (which !== 'live' && which !== 'source') {
      return NextResponse.json({ error: 'invalid_password_type' }, { status: 400 })
    }

    // Solo ADMINs en impersonación pueden ver el sourcePassword
    if (which === 'source') {
      if (!session.isImpersonating) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
    }

    const password = which === 'live'
      ? await revealLivePassword(ctx.clientId, session.clientId)
      : await revealSourcePassword(ctx.clientId, session.clientId)

    return NextResponse.json({ password })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    console.error('[streaming/connection POST]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
