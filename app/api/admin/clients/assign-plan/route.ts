import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSubscriptionPayments } from '@/lib/payment-generator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clientId, planId, startDate } = await request.json()

    if (!clientId || !planId) {
      return NextResponse.json({ error: 'ClientId y PlanId son requeridos' }, { status: 400 })
    }

    // Validar fecha de inicio si se proporciona
    if (startDate) {
      const start = new Date(startDate)
      
      if (isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Fecha de inicio inválida' }, { status: 400 })
      }
    }

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Verificar que el plan existe y está activo
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    })

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Plan no encontrado o inactivo' }, { status: 404 })
    }

    // Usar transacción para asignar plan y crear suscripción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el cliente con el nuevo plan
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { planId: planId }
      })

      // Cancelar suscripción anterior si existe
      await tx.subscription.updateMany({
        where: { 
          clientId: clientId,
          status: 'active'
        },
        data: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Plan cambiado por administrador'
        }
      })

      // Crear nueva suscripción con fecha de inicio personalizada o automática
      let subscriptionStartDate: Date
      let subscriptionEndDate: Date
      
      if (startDate) {
        // Usar fecha de inicio personalizada
        subscriptionStartDate = new Date(startDate)
        subscriptionEndDate = new Date(startDate)
        
        // Calcular fecha de fin según el intervalo del plan
        if (plan.interval === 'monthly') {
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1)
        } else if (plan.interval === 'yearly') {
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1)
        }
      } else {
        // Usar fechas automáticas (comportamiento por defecto)
        subscriptionStartDate = new Date()
        subscriptionEndDate = new Date()
        
        // Calcular fecha de vencimiento según el intervalo del plan
        if (plan.interval === 'monthly') {
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1)
        } else if (plan.interval === 'yearly') {
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1)
        }
      }

      const subscription = await tx.subscription.create({
        data: {
          clientId: clientId,
          planId: planId,
          status: 'active',
          startDate: subscriptionStartDate,
          endDate: subscriptionEndDate,
        }
      })

      // Generar pagos desde la fecha de inicio hasta hoy, respetando el intervalo del plan
      const paymentsData = await generateSubscriptionPayments(
        tx,
        subscription.id,
        clientId,
        planId,
        subscriptionStartDate,
        subscriptionEndDate,
        plan.price,
        plan.currency,
        plan.interval as 'monthly' | 'yearly'
      )

      // Crear todos los pagos generados
      const payments = await Promise.all(
        paymentsData.map(paymentData => 
          tx.payment.create({ data: paymentData })
        )
      )

      return { client: updatedClient, subscription, payments }
    })

    // Aplicar cuotas de almacenamiento del plan + crear streams faltantes
    try {
      const { applyPlanQuotasToClient, ensureStreamsForServices } = await import('@/lib/signup')
      await applyPlanQuotasToClient(clientId, plan)
      await ensureStreamsForServices(clientId, plan.services || 'both')
    } catch {}

    // Hook: se generan cuotas pendientes → aviso de cobro (tras el commit, aislado)
    try {
      const pending = (result.payments as any[])
        .filter((p) => p.status === 'pending')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
      if (pending) {
        const { sendAccountEmail } = await import('@/lib/email-hooks')
        await sendAccountEmail(
          pending.clientId,
          { amount: pending.amount, currency: pending.currency, dueDate: pending.dueDate, description: pending.description },
          plan.name
        )
      }
    } catch {}

    return NextResponse.json({
      message: 'Plan asignado exitosamente',
      client: result.client,
      subscription: result.subscription,
      payments: result.payments,
      paymentsCount: result.payments.length
    })

  } catch (error) {
    console.error('Error al asignar plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}