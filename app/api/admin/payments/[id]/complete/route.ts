import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completePaymentAndGenerateNext } from '@/lib/payment-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const paymentId = params.id
    const body = await request.json().catch(() => ({}))
    const { paidAt, paymentMethod, receiptUrl } = body || {}

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }
    if (payment.status === 'completed') {
      return NextResponse.json(
        { error: 'Este pago ya fue completado' },
        { status: 400 }
      )
    }

    let paidAtDate: Date | undefined
    if (paidAt) {
      const parsed = new Date(paidAt)
      if (!isNaN(parsed.getTime())) paidAtDate = parsed
    }

    const result = await completePaymentAndGenerateNext(
      prisma,
      paymentId,
      paymentMethod || 'manual',
      receiptUrl,
      paidAtDate
    )

    return NextResponse.json({
      message: 'Pago completado exitosamente',
      payment: result.updatedPayment,
      nextPayment: result.nextPayment,
    })
  } catch (error) {
    console.error('Error al completar pago:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
