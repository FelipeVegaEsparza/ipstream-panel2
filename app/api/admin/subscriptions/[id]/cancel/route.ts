import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
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

    // Obtener la suscripción
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { client: true, plan: true }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

      // Cancelar la suscripción
      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Cancelada por administrador',
        },
        include: {
          client: { include: { user: true } },
          plan: true
        }
      })

    return NextResponse.json({
      message: 'Suscripción cancelada exitosamente',
      subscription: updatedSubscription
    })

  } catch (error) {
    console.error('Error al cancelar suscripción:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
