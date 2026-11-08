'use client'

import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  paymentMethod: string
  description: string | null
  receiptUrl: string | null
  dueDate: Date
  paidAt: Date | null
  createdAt: Date
  subscription: {
    plan: {
      name: string
    }
  } | null
}

interface Client {
  id: string
  name: string
  plan: {
    id: string
    name: string
    price: number
    currency: string
    interval: string
  } | null
  subscription: {
    id: string
    status: string
    startDate: Date
    endDate: Date
    plan: {
      name: string
      price: number
      currency: string
      interval: string
    }
    payments?: Array<{
      id: string
      status: string
      dueDate: Date
      paidAt: Date | null
    }>
  } | null
}

interface ClientPaymentsViewProps {
  client: Client
  payments: Payment[]
  paypalEnabled?: boolean
  paypalCurrencies?: string[]
}

export function ClientPaymentsView({
  client,
  payments,
  paypalEnabled = false,
  paypalCurrencies = [],
}: ClientPaymentsViewProps) {
  const { t, locale } = useDashboardI18n()
  const [paying, setPaying] = useState<string | null>(null)

  // Retorno del checkout de PayPal: captura la orden por `?token=<orderId>`.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('paypal')
    if (mode === 'return') {
      const orderId = params.get('token')
      if (orderId) {
        fetch('/api/checkout/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
          .then((r) => r.json())
          .then((d) => window.alert(d.ok ? t('payments.completed') : d.error || t('payments.couldNotComplete')))
          .catch(() => window.alert(t('payments.completeError')))
          .finally(() => {
            window.location.href = '/dashboard/payments'
          })
      }
    } else if (mode === 'cancel') {
      window.history.replaceState({}, '', '/dashboard/payments')
    }
  }, [])

  async function payWithPaypal(paymentId: string) {
    setPaying(paymentId)
    try {
      const res = await fetch('/api/checkout/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('payments.startError'))
      if (!data.approvalUrl) throw new Error(t('payments.noApprovalUrl'))
      window.location.href = data.approvalUrl
    } catch (err) {
      window.alert((err as Error).message)
      setPaying(null)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'CLP') {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDaysUntilNextPayment = () => {
    if (!client.subscription) return null

    // Buscar el próximo pago pendiente más cercano
    const payments = client.subscription.payments || []
    const pendingPayments = payments
      .filter((p: any) => p.status === 'pending')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    if (pendingPayments.length > 0) {
      const nextPayment = pendingPayments[0]
      const now = new Date()
      const nextPaymentDate = new Date(nextPayment.dueDate)
      const diffTime = nextPaymentDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    // Si no hay pagos pendientes, usar la fecha de fin de la suscripción
    const now = new Date()
    const endDate = new Date(client.subscription.endDate)
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  const getNextPaymentDate = () => {
    if (!client.subscription) return null

    // Buscar el próximo pago pendiente más cercano
    const payments = client.subscription.payments || []
    const pendingPayments = payments
      .filter((p: any) => p.status === 'pending')
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

    if (pendingPayments.length > 0) {
      return pendingPayments[0].dueDate
    }

    // Si no hay pagos pendientes, usar la fecha de fin de la suscripción
    return client.subscription.endDate
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { className: 'badge-success', text: t('payments.status.paid') },
      pending: { className: 'badge-warning', text: t('payments.status.pending') },
      failed: { className: 'badge-danger', text: t('payments.status.failed') },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={config.className}>{config.text}</Badge>
  }

  const daysUntilNext = getDaysUntilNextPayment()
  const nextPaymentDate = getNextPaymentDate()
  const planInterval = client.subscription?.plan.interval === 'monthly' ? t('payments.monthly') : t('payments.yearly')

  const methodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return t('payments.method.bank')
      case 'credit_card':
        return t('payments.method.card')
      case 'cash':
        return t('payments.method.cash')
      case 'manual':
        return t('payments.method.manual')
      case 'paypal':
        return t('payments.method.paypal')
      default:
        return t('payments.method.other')
    }
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader title={t('payments.title')} description={t('payments.subtitle')} />

      {client.subscription && nextPaymentDate && (
        <section className="dashboard-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-medium text-foreground">{t('payments.next')}</h2>
            {daysUntilNext !== null && (
              <span
                className={`text-[11px] ${
                  daysUntilNext < 0
                    ? 'text-danger'
                    : daysUntilNext <= 7
                      ? 'text-warn'
                      : 'text-muted-foreground'
                }`}
              >
                {daysUntilNext < 0
                  ? t('payments.overdueDays', { days: Math.abs(daysUntilNext) })
                  : daysUntilNext === 0
                    ? t('payments.dueToday')
                    : t('payments.daysLeft', { days: daysUntilNext })}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-muted-foreground">{t('payments.currentPlan')}</p>
              <p className="mt-1 text-[15px] font-medium text-foreground">{client.subscription.plan.name}</p>
              <p className="text-[11px] text-muted-foreground">{planInterval}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t('payments.amount')}</p>
              <p className="dashboard-metric mt-1 text-2xl text-foreground">
                {formatCurrency(client.subscription.plan.price, client.subscription.plan.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{t('payments.dueDate')}</p>
              <p className="mt-1 text-[15px] font-medium text-foreground">{formatDate(nextPaymentDate)}</p>
            </div>
          </div>

          {daysUntilNext !== null && daysUntilNext <= 7 && (
            <div className="mt-4 flex items-start gap-2 border-t border-line pt-3">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  daysUntilNext < 0 ? 'bg-danger' : 'bg-warn'
                }`}
              />
              <div>
                <p className={`text-[12px] font-medium ${daysUntilNext < 0 ? 'text-danger' : 'text-warn'}`}>
                  {daysUntilNext < 0 ? t('payments.expired') : t('payments.expiring')}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t('payments.renewHint')}</p>
              </div>
            </div>
          )}
        </section>
      )}

      {!client.subscription && (
        <section className="dashboard-panel p-6">
          <h3 className="text-[15px] font-medium text-foreground">{t('payments.noPlan')}</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">{t('payments.noPlanHint')}</p>
        </section>
      )}

      <section className="dashboard-panel overflow-hidden">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-medium text-foreground">{t('payments.history')}</h2>
        </div>

        {payments.length > 0 ? (
          <div className="divide-y divide-line">
            {payments.map((payment) => (
              <div key={payment.id} className="px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="dashboard-metric text-[15px] text-foreground">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {payment.subscription ? `${t('payments.planLabel', { name: payment.subscription.plan.name })} · ` : ''}
                      {payment.description ? `${payment.description} · ` : ''}
                      {t('payments.due', { date: formatDate(payment.dueDate) })}
                      {payment.paidAt ? ` · ${t('payments.paidOn', { date: formatDate(payment.paidAt) })}` : ''}
                      {` · ${methodLabel(payment.paymentMethod)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(payment.status === 'pending' || payment.status === 'failed') &&
                      paypalEnabled &&
                      paypalCurrencies.includes(payment.currency) && (
                        <Button
                          size="sm"
                          onClick={() => payWithPaypal(payment.id)}
                          disabled={paying === payment.id}
                        >
                          {paying === payment.id ? t('payments.redirecting') : t('payments.paypal')}
                        </Button>
                      )}
                    {payment.receiptUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(payment.receiptUrl!, '_blank')}
                      >
                        {t('payments.receipt')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-medium text-foreground">{t('payments.empty')}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('payments.emptyHint')}</p>
          </div>
        )}
      </section>
    </div>
  )
}
