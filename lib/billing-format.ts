export function formatCurrency(amount: number, currency: string = 'CLP'): string {
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  return `${currency} ${amount.toLocaleString('es-CL')}`
}

export function formatDate(date: Date | string, withTime: boolean = false): string {
  const d = date instanceof Date ? date : new Date(date)
  if (withTime) {
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Otro' },
]

export const PAYMENT_METHOD_LABELS: Record<string, string> = PAYMENT_METHODS.reduce(
  (acc, m) => ({ ...acc, [m.value]: m.label }),
  {} as Record<string, string>
)
