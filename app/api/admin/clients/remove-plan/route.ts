import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'ClientId es requerido' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { subscription: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Usar transacción para eliminar suscripciones, pagos y remover plan
    const result = await prisma.$transaction(async (tx) => {
      // Obtener todas las suscripciones del cliente
      const subscriptions = await tx.subscription.findMany({
        where: { clientId: clientId },
        select: { id: true }
      })

      const subscriptionIds = subscriptions.map(s => s.id)

      // Eliminar todos los pagos asociados a las suscripciones
      if (subscriptionIds.length > 0) {
        await tx.payment.deleteMany({
          where: {
            subscriptionId: { in: subscriptionIds }
          }
        })
      }

      // Eliminar todas las suscripciones del cliente
      await tx.subscription.deleteMany({
        where: { clientId: clientId }
      })

      // Remover el plan del cliente
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { planId: null }
      })

      return { client: updatedClient }
    })

    return NextResponse.json({
      message: 'Plan removido exitosamente',
      client: result.client
    })

  } catch (error) {
    console.error('Error al remover plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
