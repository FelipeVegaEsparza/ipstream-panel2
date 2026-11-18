import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { resolveReferralReview } from '@/lib/referrals/admin'
import { getRequestIp } from '@/lib/referrals/http'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const decision = body?.action
    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }
    const reason = typeof body?.reason === 'string' ? body.reason : ''
    if (decision === 'reject' && !reason.trim()) {
      return NextResponse.json({ error: 'El motivo es obligatorio' }, { status: 400 })
    }

    const result = await resolveReferralReview(
      params.id,
      decision,
      reason,
      {
        userId: session.user.id,
        role: 'ADMIN',
        ipAddress: getRequestIp(request),
      }
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    const status = message.includes('obligatorio') ? 400 : 500
    console.error('Error resolviendo revisión de referido:', error)
    return NextResponse.json({ error: message }, { status })
  }
}
