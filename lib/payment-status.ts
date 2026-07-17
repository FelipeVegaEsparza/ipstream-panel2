export type PaymentStatusLabel = 'overdue' | 'due_soon' | 'current' | 'no_plan' | 'no_subscription'

export interface ClientPayment {
  id: string
  amount: number
  currency: string
  status: string
  dueDate: Date | string
  paidAt: Date | string | null
  createdAt: Date | string
  paymentMethod: string
  description?: string | null
  receiptUrl?: string | null
}

export interface ClientSubscriptionLite {
  id: string
  status: string
  startDate: Date | string
  endDate: Date | string
}

export interface PaymentStatusResult {
  status: PaymentStatusLabel
  label: PaymentStatusLabel
  color: string
  daysUntilDue: number | null
  nextPayment: ClientPayment | null
  lastPayment: ClientPayment | null
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DUE_SOON_DAYS = 7

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY)
}

function sortByDueDateAsc(a: ClientPayment, b: ClientPayment): number {
  return toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime()
}

function sortByPaidAtDesc(a: ClientPayment, b: ClientPayment): number {
  const aDate = toDate(a.paidAt ?? a.createdAt).getTime()
  const bDate = toDate(b.paidAt ?? b.createdAt).getTime()
  return bDate - aDate
}

export function getClientPaymentStatus(
  hasPlan: boolean,
  subscription: ClientSubscriptionLite | null | undefined,
  payments: ClientPayment[],
  now: Date = new Date()
): PaymentStatusResult {
  if (!hasPlan) {
    return {
      status: 'no_plan',
      label: 'no_plan',
      color: 'bg-gray-600',
      daysUntilDue: null,
      nextPayment: null,
      lastPayment: null,
    }
  }

  if (!subscription) {
    return {
      status: 'no_subscription',
      label: 'no_subscription',
      color: 'bg-gray-500',
      daysUntilDue: null,
      nextPayment: null,
      lastPayment: null,
    }
  }

  const pendingPayments = payments
    .filter((p) => p.status === 'pending' || p.status === 'failed')
    .sort(sortByDueDateAsc)

  const completedPayments = payments
    .filter((p) => p.status === 'completed' || p.status === 'refunded')
    .sort(sortByPaidAtDesc)

  const nextPayment = pendingPayments[0] ?? null
  const lastPayment = completedPayments[0] ?? null

  let daysUntilDue: number | null = null
  if (nextPayment) {
    daysUntilDue = daysBetween(now, toDate(nextPayment.dueDate))
  } else {
    daysUntilDue = daysBetween(now, toDate(subscription.endDate))
  }

  let status: PaymentStatusLabel = 'current'
  if (daysUntilDue !== null) {
    if (daysUntilDue < 0) {
      status = 'overdue'
    } else if (daysUntilDue <= DUE_SOON_DAYS) {
      status = 'due_soon'
    } else {
      status = 'current'
    }
  }

  const colorMap: Record<PaymentStatusLabel, string> = {
    overdue: 'bg-red-600',
    due_soon: 'bg-orange-600',
    current: 'bg-green-600',
    no_plan: 'bg-gray-600',
    no_subscription: 'bg-gray-500',
  }

  return {
    status,
    label: status,
    color: colorMap[status],
    daysUntilDue,
    nextPayment,
    lastPayment,
  }
}

export const STATUS_BADGES: Record<
  PaymentStatusLabel,
  { text: string; color: string; icon: 'check' | 'clock' | 'alert' | 'minus' }
> = {
  overdue: { text: 'Vencido', color: 'bg-red-600', icon: 'alert' },
  due_soon: { text: 'Por vencer', color: 'bg-orange-600', icon: 'clock' },
  current: { text: 'Al día', color: 'bg-green-600', icon: 'check' },
  no_plan: { text: 'Sin plan', color: 'bg-gray-600', icon: 'minus' },
  no_subscription: { text: 'Sin suscripción', color: 'bg-gray-500', icon: 'minus' },
}
