// =====================================================
// /api/admin/streaming/[clientId]/reveal — revelar passwords
// =====================================================
// Solo accesible para ADMIN. Audita el acceso.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revealLivePassword, revealSourcePassword } from '@/lib/streaming-helpers'

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
    const which = body?.type

    if (which !== 'live' && which !== 'source') {
      return NextResponse.json({ error: 'invalid_type', message: 'type debe ser "live" o "source"' }, { status: 400 })
    }

    const password = which === 'live'
      ? await revealLivePassword(params.clientId, session.user.id)
      : await revealSourcePassword(params.clientId, session.user.id)

    return NextResponse.json({ password, type: which })
  } catch (err: any) {
    if (err.message === 'RadioStream no encontrado') {
      return NextResponse.json({ error: 'no_radio_stream' }, { status: 404 })
    }
    console.error('[admin/streaming reveal]', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
