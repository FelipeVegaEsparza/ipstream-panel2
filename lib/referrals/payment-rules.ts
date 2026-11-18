// =====================================================
// Programa de referidos — reglas de pagos y ciclos
// =====================================================
// Funciones puras para decidir qué pagos validan un referido. No dependen
// de Prisma ni del frontend: la validación siempre se recalcula desde la DB.

export interface ValidationPaymentLike {
  id?: string
  status?: string | null
  amount?: number | null
  currency?: string | null
  paidAt?: Date | string | null
  paymentMethod?: string | null
  transactionId?: string | null
  creditApplied?: number | null
  dueDate?: Date | string | null
}

export type PlanInterval = 'monthly' | 'yearly' | string

const TEST_METHODS = new Set(['test', 'sandbox'])

/** Un pago cuenta para validar un referido solo si es real, confirmado y monetario. */
export function isValidationPayment(payment: ValidationPaymentLike | null | undefined): boolean {
  if (!payment) return false
  if (payment.status !== 'completed') return false
  if (!payment.paidAt) return false
  if (!(Number(payment.amount) > 0)) return false
  if ((payment.paymentMethod || '').toLowerCase() === 'referral_credit') return false
  if (Number(payment.creditApplied || 0) > 0) return false
  if (TEST_METHODS.has((payment.paymentMethod || '').toLowerCase())) return false
  const tx = (payment.transactionId || '').toUpperCase()
  if (tx.startsWith('TEST_') || tx.startsWith('TEST-')) return false
  return true
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? new Date(value) : new Date(value)
}

/** Suma meses/anos conservando el día cuando el mes destino lo permite. */
export function addCycle(date: Date | string, interval: PlanInterval, count = 1): Date {
  const base = toDate(date)
  const target = new Date(base)
  const day = base.getDate()
  target.setDate(1)
  if (interval === 'yearly') {
    target.setFullYear(target.getFullYear() + count)
  } else {
    target.setMonth(target.getMonth() + count)
  }
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  return target
}

/** Fechas de los primeros `count` ciclos desde el inicio de la suscripción. */
export function expectedCycleDates(
  startDate: Date | string,
  interval: PlanInterval,
  count = 2
): Date[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    addCycle(startDate, interval, index)
  )
}

function cycleKey(date: Date | string, interval: PlanInterval): string {
  const d = toDate(date)
  if (interval === 'yearly') return String(d.getFullYear())
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function pickCyclePayment(
  payments: ValidationPaymentLike[],
  key: string,
  interval: PlanInterval
): ValidationPaymentLike | null {
  const group = payments.filter((p) => p.dueDate && cycleKey(p.dueDate, interval) === key)
  if (group.length === 0) return null
  // Si la misma transacción aparece duplicada, se cuenta una sola vez.
  const seen = new Set<string>()
  for (const payment of group) {
    const id = payment.id || payment.transactionId || `${key}:${seen.size}`
    if (seen.has(id)) continue
    seen.add(id)
    if (isValidationPayment(payment)) return payment
  }
  return null
}

export interface ValidationSelection {
  first: ValidationPaymentLike | null
  second: ValidationPaymentLike | null
  firstConfirmed: boolean
  secondConfirmed: boolean
  cycleKeys: string[]
}

/**
 * Selecciona los pagos que validan el referido: los dos primeros ciclos de la
 * suscripción deben tener un pago confirmado y válido. Un ciclo faltante o
 * cubierto por crédito rompe la secuencia.
 */
export function selectValidationPayments(
  payments: ValidationPaymentLike[],
  opts: { startDate: Date | string; interval: PlanInterval; cycles?: number }
): ValidationSelection {
  const cycles = opts.cycles ?? 2
  const keys = expectedCycleDates(opts.startDate, opts.interval, cycles).map((date) =>
    cycleKey(date, opts.interval)
  )
  const usable = payments.filter((p) => Boolean(p.dueDate))
  const selected = keys.map((key) => pickCyclePayment(usable, key, opts.interval))
  return {
    first: selected[0] ?? null,
    second: selected[1] ?? null,
    firstConfirmed: Boolean(selected[0]),
    secondConfirmed: Boolean(selected[1]),
    cycleKeys: keys,
  }
}
