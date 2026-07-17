import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createManualPayment } from '@/lib/payment-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, amount, currency, paymentMethod, description, paidAt } = body

    if (!subscriptionId || amount === undefined || !currency) {
      return NextResponse.json(
        { error: 'subscriptionId, amount y currency son requeridos' },
        { status: 400 }
      )
    }

    let paidAtDate: Date | undefined
    if (paidAt) {
      const parsed = new Date(paidAt)
      if (!isNaN(parsed.getTime())) paidAtDate = parsed
    }

    const result = await createManualPayment(prisma, {
      subscriptionId,
      amount: Number(amount),
      currency,
      paymentMethod: paymentMethod || 'manual',
      description,
      paidAt: paidAtDate,
    })

    return NextResponse.json({
      message: 'Pago registrado exitosamente',
      payment: result.payment,
      nextPayment: result.nextPayment,
    })
  } catch (error) {
    console.error('Error al registrar pago:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
