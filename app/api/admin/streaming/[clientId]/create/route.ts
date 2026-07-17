// =====================================================
// /api/admin/streaming/[clientId]/create — crear RadioStream
// =====================================================
// Para clients que no tienen RadioStream todavía (ej. creados
// antes de Phase 6, o donde falló el auto-create).

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRadioStreamForClient } from '@/lib/streaming-helpers'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    // Verificar que el client existe
    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
      select: { id: true, name: true, radioStream: { select: { id: true } } },
    })
    if (!client) {
      return NextResponse.json({ error: 'client_not_found' }, { status: 404 })
    }

    // Verificar que NO tiene ya un RadioStream
    if (client.radioStream) {
      return NextResponse.json({
        error: 'already_exists',
        message: 'Este cliente ya tiene un RadioStream',
      }, { status: 409 })
    }

    // Crear
    const created = await createRadioStreamForClient(params.clientId)

    // Audit
    await prisma.streamingAuditLog.create({
      data: {
        clientId: params.clientId,
        action: 'config_update',
        payload: {
          event: 'radio_stream_created_by_admin',
          adminId: session.user.id,
          icecastMount: created.icecastMount,
        } as any,
      },
    })

    return NextResponse.json({
      ok: true,
      radioStream: {
        id: created.radioStream.id,
        clientId: created.radioStream.clientId,
        icecastMount: created.icecastMount,
        telnetPort: created.telnetPort,
        bitrate: created.radioStream.bitrate,
        status: created.radioStream.status,
      },
    })
  } catch (err: any) {
    console.error('[admin/streaming create]', err)
    return NextResponse.json({ error: 'internal_error', message: err.message }, { status: 500 })
  }
}
