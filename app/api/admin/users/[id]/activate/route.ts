import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createSignupSubscription } from '@/lib/signup'
import { SUBSCRIPTION_STATUS } from '@/lib/subscription-status'
import { formatDate } from '@/lib/billing-format'

class ActivationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        client: {
          include: {
            plan: true,
            subscription: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    if (user.isActive) {
      return NextResponse.json({ message: 'La cuenta ya está activa', alreadyActive: true })
    }
    if (!user.client) {
      return NextResponse.json({ error: 'El usuario no tiene un cliente asociado' }, { status: 400 })
    }
    if (!user.client.planId) {
      throw new ActivationError('Asigna un plan antes de activar la cuenta.')
    }

    const clientId = user.client.id

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        include: { plan: true, subscription: true },
      })
      if (!client) throw new ActivationError('Cliente no encontrado', 404)
      if (!client.planId) throw new ActivationError('Asigna un plan antes de activar la cuenta.')
      if (!client.plan || !client.plan.isActive) {
        throw new ActivationError('El plan asignado no está activo.')
      }

      let subscription = client.subscription
      let payment: {
        amount: number
        currency: string
        dueDate: Date
        description: string | null
      } | null = null
      let createdSubscription = false

      if (!subscription) {
        let priced: { currency: string; amount: number } | null = null
        if (client.billingCurrency) {
          const planPrice = await tx.planPrice.findUnique({
            where: {
              planId_currency: {
                planId: client.plan.id,
                currency: client.billingCurrency,
              },
            },
          })
          if (planPrice) priced = { currency: planPrice.currency, amount: planPrice.amount }
        }

        const created = await createSignupSubscription(tx, client.id, client.plan, priced)
        subscription = created.subscription
        payment = created.payment
        createdSubscription = true
      } else {
        if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
          subscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: SUBSCRIPTION_STATUS.ACTIVE },
          })
        }
        payment = await tx.payment.findFirst({
          where: { subscriptionId: subscription.id, status: 'pending' },
          orderBy: { dueDate: 'asc' },
        })
      }

      await tx.user.update({
        where: { id: user.id },
        data: { isActive: true },
      })

      return { subscription, payment, plan: client.plan, createdSubscription }
    })

    const { sendAccountActivatedEmail, sendAccountEmail } = await import('@/lib/email-hooks')
    const activationEmail = await sendAccountActivatedEmail(clientId)

    let paymentEmail = { ok: false, status: 'skipped' }
    if (result.payment) {
      const notice = result.createdSubscription
        ? `Tu plan está activo por 24 horas. Realiza el pago antes del ${formatDate(result.payment.dueDate, true)} para mantener el servicio.`
        : undefined
      paymentEmail = await sendAccountEmail(
        clientId,
        {
          amount: result.payment.amount,
          currency: result.payment.currency,
          dueDate: result.payment.dueDate,
          description: result.payment.description,
        },
        result.plan.name,
        notice
      )
    }

    return NextResponse.json({
      message: 'Cuenta activada correctamente',
      activationEmail,
      paymentEmail,
      plan: result.plan.name,
    })
  } catch (error) {
    if (error instanceof ActivationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Error activating user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
