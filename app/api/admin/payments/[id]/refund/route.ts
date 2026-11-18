import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { recordReferralAudit } from '@/lib/referrals/audit'
import { handlePaymentReversed } from '@/lib/referrals/reversal'
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
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      select: { id: true, clientId: true, status: true, amount: true, currency: true },
    })
    if (!payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

    if (payment.status !== 'refunded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'refunded' },
      })
    }

    const reversal = await handlePaymentReversed(payment.id, prisma, {
      userId: session.user.id,
      role: 'ADMIN',
      ipAddress: getRequestIp(request),
    })

    await recordReferralAudit({
      actor: { userId: session.user.id, role: 'ADMIN' },
      action: 'payment.refunded',
      clientId: payment.clientId,
      before: { status: payment.status, amount: payment.amount, currency: payment.currency },
      after: { status: 'refunded' },
      reason: reason || null,
      ipAddress: getRequestIp(request),
    })

    return NextResponse.json({ ok: true, ...reversal })
  } catch (error) {
    console.error('Error reembolsando pago:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
