import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const subscriptionId = params.id
    if (!subscriptionId) {
      return NextResponse.json({ error: 'ID de suscripción requerido' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true, client: true },
      })

      if (!subscription) {
        throw new Error('Suscripción no encontrada')
      }

      if (subscription.status === 'cancelled') {
        throw new Error('No se puede renovar una suscripción cancelada')
      }

      const today = new Date()
      const dayOfMonth = new Date(subscription.startDate).getDate()

      const baseDate =
        new Date(subscription.endDate) > today
          ? new Date(subscription.endDate)
          : today

      const nextDueDate = new Date(baseDate)
      if (subscription.plan.interval === 'yearly') {
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1)
      } else {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1)
      }
      nextDueDate.setDate(dayOfMonth)

      await tx.payment.deleteMany({
        where: { subscriptionId, status: 'pending' },
      })

      const intervalLabel = subscription.plan.interval === 'yearly' ? 'Pago anual' : 'Pago mensual'

      const newPayment = await tx.payment.create({
        data: {
          clientId: subscription.clientId,
          subscriptionId,
          amount: subscription.plan.price,
          currency: subscription.plan.currency,
          status: 'pending',
          paymentMethod: 'pending',
          description: `${intervalLabel} - ${nextDueDate.toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric',
          })}`,
          dueDate: nextDueDate,
          paidAt: null,
          transactionId: null,
        },
      })

      const newEndDate = new Date(nextDueDate)
      newEndDate.setMonth(newEndDate.getMonth() + 1)

      const updatedSubscription = await tx.subscription.update({
        where: { id: subscriptionId },
        data: { endDate: newEndDate, status: 'active' },
        include: { plan: true, client: { include: { user: true } } },
      })

      return { subscription: updatedSubscription, nextPayment: newPayment }
    })

    return NextResponse.json({
      message: 'Suscripción renovada exitosamente',
      subscription: result.subscription,
      nextPayment: result.nextPayment,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('Error al renovar suscripción:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
