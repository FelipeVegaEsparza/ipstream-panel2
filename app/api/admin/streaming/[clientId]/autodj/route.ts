// =====================================================
// /api/admin/streaming/[clientId]/autodj — iniciar/detener AutoDJ
// =====================================================
// Solo ADMIN. Controla el AutoDJ de un cliente con RadioStream
// llamando al streaming-agent (/start, /stop) y audita la acción.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamingClient, StreamingAgentError } from '@/lib/streaming-client'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = body?.action

    if (action !== 'start' && action !== 'stop') {
      return NextResponse.json({ error: 'invalid_action', message: 'action debe ser "start" o "stop"' }, { status: 400 })
    }

    // Verificar que el cliente tiene RadioStream
    const radioStream = await prisma.radioStream.findUnique({
      where: { clientId: params.clientId },
    })
    if (!radioStream) {
      return NextResponse.json({ error: 'no_radio_stream', message: 'El cliente no tiene RadioStream' }, { status: 404 })
    }

    let result
    if (action === 'start') result = await streamingClient.start(params.clientId)
    else result = await streamingClient.stop(params.clientId)

    // Auditar la acción
    await prisma.streamingAuditLog.create({
      data: {
        clientId: params.clientId,
        action: action === 'start' ? 'stream_start' : 'stream_stop',
        payload: {
          event: action === 'start' ? 'admin_autodj_started' : 'admin_autodj_stopped',
          adminId: session.user.id,
          agent: result,
        } as any,
      },
    })

    return NextResponse.json({ ok: true, action, status: radioStream.status, ...result })
  } catch (err) {
    if (err instanceof StreamingAgentError) {
      return NextResponse.json({
        error: 'agent_error',
        message: err.message,
        status: err.status,
      }, { status: 502 })
    }
    console.error('[admin/streaming autodj]', err)
    return NextResponse.json({ error: 'internal_error', message: 'Error interno del servidor' }, { status: 500 })
  }
}
