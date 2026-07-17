import { PrismaClient, Prisma } from '@prisma/client'

type PrismaLike = PrismaClient | any
type PaymentCreateData = Prisma.PaymentUncheckedCreateInput
type PlanInterval = 'monthly' | 'yearly'

const INTERVAL_LABEL: Record<PlanInterval, string> = {
  monthly: 'Pago mensual',
  yearly: 'Pago anual',
}

/**
 * Avanza la fecha del cursor al siguiente ciclo del plan,
 * respetando el intervalo (mensual o anual).
 */
function advanceByInterval(cursor: Date, interval: PlanInterval, dayOfMonth: number): void {
  if (interval === 'yearly') {
    cursor.setFullYear(cursor.getFullYear() + 1)
  } else {
    cursor.setMonth(cursor.getMonth() + 1)
  }
  cursor.setDate(dayOfMonth)
}

/**
 * Genera los pagos iniciales de una suscripción.
 * - Respetando el intervalo del plan (mensual o anual).
 * - El primero se crea como `completed`; los intermedios como `pending`.
 * - No crea pagos para fechas futuras.
 * - Si el plan es anual, solo crea 1 pago (el del año de inicio).
 */
export async function generateSubscriptionPayments(
  prisma: PrismaLike,
  subscriptionId: string,
  clientId: string,
  planId: string,
  startDate: Date,
  endDate: Date,
  amount: number,
  currency: string,
  planInterval: PlanInterval
) {
  void planId
  const now = new Date()
  const normalizedNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfMonth = startDate.getDate()
  const intervalLabel = INTERVAL_LABEL[planInterval]

  const payments: PaymentCreateData[] = []
  let cursor = new Date(startDate)

  while (cursor <= endDate) {
    const normalizedCursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate()
    )

    if (normalizedCursor > normalizedNow) break

    const existing = await prisma.payment.findFirst({
      where: { subscriptionId, dueDate: cursor },
      select: { id: true },
    })

    if (!existing) {
      const isFirstPayment = cursor.getTime() === startDate.getTime()
      payments.push({
        clientId,
        subscriptionId,
        amount,
        currency,
        status: isFirstPayment ? 'completed' : 'pending',
        paymentMethod: isFirstPayment ? 'manual' : 'pending',
        description: `${intervalLabel} - ${cursor.toLocaleDateString('es-ES', {
          month: 'long',
          year: 'numeric',
        })}`,
        dueDate: new Date(cursor),
        paidAt: isFirstPayment ? new Date(cursor) : null,
        transactionId: isFirstPayment ? `AUTO_${Date.now()}` : null,
      })
    }

    advanceByInterval(cursor, planInterval, dayOfMonth)
  }

  return payments
}

/** @deprecated usar `generateSubscriptionPayments` que respeta el intervalo. */
export const generateMonthlyPayments = generateSubscriptionPayments

/**
 * Calcula la fecha del siguiente pago respetando el intervalo del plan
 * (mensual o anual) y el día del mes original de la fecha de inicio.
 */
function computeNextDueDate(
  referenceDate: Date,
  subscriptionStartDate: Date,
  planInterval: string
): Date {
  const dayOfMonth = subscriptionStartDate.getDate()
  const next = new Date(referenceDate)
  if (planInterval === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
  } else {
    next.setMonth(next.getMonth() + 1)
  }
  next.setDate(dayOfMonth)
  return next
}

/**
 * Marca un pago como completado y crea el siguiente pago pendiente del ciclo.
 * - Borra pagos pendientes antiguos para no acumular duplicados.
 * - El siguiente pago respeta el intervalo del plan.
 * - Extiende la fecha de fin de la suscripción en 1 mes de margen.
 */
export async function completePaymentAndGenerateNext(
  prisma: PrismaLike,
  paymentId: string,
  paymentMethod: string,
  receiptUrl?: string,
  customPaidDate?: Date
) {
  return await prisma.$transaction(async (tx: any) => {
    const currentPayment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { subscription: { include: { plan: true } } },
    })

    if (!currentPayment || !currentPayment.subscription) {
      throw new Error('Pago o suscripción no encontrada')
    }

    const planInterval = (currentPayment.subscription.plan.interval as PlanInterval) || 'monthly'
    const intervalLabel = INTERVAL_LABEL[planInterval]

    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        paymentMethod,
        paidAt: customPaidDate || new Date(),
        receiptUrl,
        transactionId: `MANUAL_${Date.now()}`,
      },
    })

    await tx.payment.deleteMany({
      where: { subscriptionId: currentPayment.subscriptionId, status: 'pending' },
    })

    const nextDueDate = computeNextDueDate(
      new Date(currentPayment.dueDate),
      new Date(currentPayment.subscription.startDate),
      currentPayment.subscription.plan.interval
    )

    const newEndDate = new Date(nextDueDate)
    if (planInterval === 'yearly') {
      newEndDate.setMonth(newEndDate.getMonth() + 1)
    } else {
      newEndDate.setMonth(newEndDate.getMonth() + 1)
    }

    await tx.subscription.update({
      where: { id: currentPayment.subscriptionId },
      data: { endDate: newEndDate, status: 'active' },
    })

    const nextPayment = await tx.payment.create({
      data: {
        clientId: currentPayment.clientId,
        subscriptionId: currentPayment.subscriptionId,
        amount: currentPayment.subscription.plan.price,
        currency: currentPayment.subscription.plan.currency,
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

    return { updatedPayment, nextPayment }
  })
}

/**
 * Crea un pago manual para una suscripción, respetando el intervalo del plan.
 * - Calcula el `dueDate` desde la fecha de inicio de la suscripción,
 *   avanzando N ciclos según la cantidad de pagos ya completados.
 * - Genera el siguiente pago pendiente con la fecha correcta.
 */
export async function createManualPayment(
  prisma: PrismaLike,
  params: {
    subscriptionId: string
    amount: number
    currency: string
    paymentMethod: string
    description?: string
    paidAt?: Date
  }
) {
  const { subscriptionId, amount, currency, paymentMethod, description, paidAt } = params

  return await prisma.$transaction(async (tx: any) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, client: true },
    })

    if (!subscription) {
      throw new Error('Suscripción no encontrada')
    }

    const planInterval = (subscription.plan.interval as PlanInterval) || 'monthly'
    const intervalLabel = INTERVAL_LABEL[planInterval]
    const dayOfMonth = new Date(subscription.startDate).getDate()
    const completedCount = await tx.payment.count({
      where: { subscriptionId, status: 'completed' },
    })

    const dueDate = new Date(subscription.startDate)
    if (planInterval === 'yearly') {
      dueDate.setFullYear(dueDate.getFullYear() + completedCount)
    } else {
      dueDate.setMonth(dueDate.getMonth() + completedCount)
    }
    dueDate.setDate(dayOfMonth)

    const payment = await tx.payment.create({
      data: {
        clientId: subscription.clientId,
        subscriptionId,
        amount,
        currency,
        status: 'completed',
        paymentMethod,
        description: description || 'Pago registrado por administrador',
        dueDate,
        paidAt: paidAt || new Date(),
        transactionId: `MANUAL_${Date.now()}`,
      },
    })

    await tx.payment.deleteMany({
      where: { subscriptionId, status: 'pending' },
    })

    const nextDueDate = computeNextDueDate(
      dueDate,
      new Date(subscription.startDate),
      subscription.plan.interval
    )

    const newEndDate = new Date(nextDueDate)
    newEndDate.setMonth(newEndDate.getMonth() + 1)

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: { endDate: newEndDate, status: 'active' },
    })

    const nextPayment = await tx.payment.create({
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

    return { payment, nextPayment }
  })
}
