// =====================================================
// /api/dashboard/streaming/connection — datos de DJ
// =====================================================
// Devuelve la info de conexión (servidor, mount) y, bajo demanda,
// el livePassword (con audit).

import { NextRequest, NextResponse } from 'next/server'
import { requireStreamingClient, StreamingAuthError } from '@/lib/streaming-auth'
import { revealLivePassword, revealSourcePassword } from '@/lib/streaming-helpers'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'
import { resolveRadioServerTarget } from '@/lib/streaming-servers'

// Evitar cacheo: el estado DJ cambia en tiempo real.
export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const ctx = await requireStreamingClient()
    if (!ctx.hasRadioStream) {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }

    // Obtener harbor port + DJ slots desde el agente
    const target = await resolveRadioServerTarget(ctx.clientId)
    let harborPort: number | null = null
    let djConnected = false
    let djSlots: any[] = []
    let planMaxDjs: number = 4
    let availableMounts: string[] = []
    try {
      if (target) {
        const harborRes = await fetch(
          `${target.baseUrl}/api/streams/${encodeURIComponent(ctx.clientId)}/harbor/status`,
          { headers: { Authorization: `Bearer ${target.token}` } }
        )
        if (harborRes.ok) {
          const harborData = await harborRes.json()
          harborPort = harborData.harborPort
          djConnected = harborData.djConnected
          djSlots = harborData.djSlots || []
          // Campos nuevos (change scale-and-stabilize-multi-dj): planMaxDjs y availableMounts.
          // Si el agente aún no los expone (versión vieja), caemos al default 4 y lista vacía.
          planMaxDjs = typeof harborData.planMaxDjs === 'number' ? harborData.planMaxDjs : 4
          availableMounts = Array.isArray(harborData.availableMounts) ? harborData.availableMounts : []
        }
      }
    } catch {
      // agent not reachable
    }

    let sessions: any = null
    let logs: string[] = []
    try {
      sessions = await streamingClient.getDjSessions(ctx.clientId, 1, 10)
    } catch {
      // agent may be old or unreachable
    }
    try {
      const logsRes = await streamingClient.getLogs(ctx.clientId, 50)
      logs = logsRes.lines || []
    } catch {
      // agent may be old or unreachable
    }

    // Datos públicos de conexión (sin password)
    const publicHost = target?.publicHostname || process.env.ICE_PUBLIC_HOSTNAME || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '').split(':')[0] || 'localhost'
    const data = {
      clientId: ctx.clientId,
      mount: ctx.icecastMount,
      host: publicHost,
      port: parseInt(process.env.ICE_PUBLIC_PORT || '8000', 10),
      harborHost: process.env.HARBOR_PUBLIC_HOSTNAME || publicHost,
      harborPort,
      harborMount: '/live',
      djConnected,
      djSlots,
      planMaxDjs,
      availableMounts,
      sessions,
      logs,
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  } catch (err) {
    if (err instanceof StreamingAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    if (err instanceof StreamingAgentError) {
      // Agent errors are non-fatal for the public connection data
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
