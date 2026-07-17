import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSubscriptionPayments } from '@/lib/payment-generator'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const subscriptionId = params.id
    const body = await request.json()
    const { startDate } = body

    if (!startDate) {
      return NextResponse.json({ error: 'startDate es requerido' }, { status: 400 })
    }

    const newStartDate = new Date(startDate)
    if (isNaN(newStartDate.getTime())) {
      return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      })

      if (!subscription) {
        throw new Error('Suscripción no encontrada')
      }

      if (subscription.status === 'cancelled') {
        throw new Error('No se puede editar una suscripción cancelada')
      }

      const newEndDate = new Date(newStartDate)
      if (subscription.plan.interval === 'yearly') {
        newEndDate.setFullYear(newEndDate.getFullYear() + 1)
      } else {
        newEndDate.setMonth(newEndDate.getMonth() + 1)
      }

      await tx.payment.deleteMany({
        where: { subscriptionId },
      })

      const updatedSubscription = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
        },
      })

      const paymentsData = await generateSubscriptionPayments(
        tx,
        subscriptionId,
        subscription.clientId,
        subscription.planId,
        newStartDate,
        newEndDate,
        subscription.plan.price,
        subscription.plan.currency,
        subscription.plan.interval as 'monthly' | 'yearly'
      )

      const payments = await Promise.all(
        paymentsData.map((p) => tx.payment.create({ data: p }))
      )

      return { subscription: updatedSubscription, payments }
    })

    return NextResponse.json({
      message: 'Fecha de inicio actualizada y pagos regenerados',
      subscription: result.subscription,
      paymentsCount: result.payments.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('Error al editar fecha de inicio:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
