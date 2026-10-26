'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  DollarSign
} from 'lucide-react'
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
      completed: { color: 'bg-green-600', text: t('payments.status.paid'), icon: CheckCircle },
      pending: { color: 'bg-yellow-600', text: t('payments.status.pending'), icon: Clock },
      failed: { color: 'bg-red-600', text: t('payments.status.failed'), icon: AlertTriangle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-foreground flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const daysUntilNext = getDaysUntilNextPayment()
  const nextPaymentDate = getNextPaymentDate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('payments.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('payments.subtitle')}
        </p>
      </div>

      {/* Próximo Pago - Destacado */}
      {client.subscription && nextPaymentDate && (
        <Card className={`border-2 ${
          daysUntilNext !== null && daysUntilNext <= 7
            ? 'border-orange-500 bg-orange-500/10'
            : daysUntilNext !== null && daysUntilNext < 0
            ? 'border-red-500 bg-red-500/10'
            : 'border-brand bg-brand/10'
        }`}>
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6 text-brand" />
              {t('payments.next')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('payments.currentPlan')}</p>
                <p className="text-xl font-bold text-foreground">
                  {client.subscription.plan.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {client.subscription.plan.interval === 'monthly' ? t('payments.monthly') : t('payments.yearly')}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('payments.amount')}</p>
                <p className="text-2xl font-bold text-brand">
                  {formatCurrency(client.subscription.plan.price, client.subscription.plan.currency)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('payments.dueDate')}</p>
                <p className="text-xl font-bold text-foreground">
                  {formatDate(nextPaymentDate)}
                </p>
                {daysUntilNext !== null && (
                  <p className={`text-sm font-medium mt-1 ${
                    daysUntilNext < 0
                      ? 'text-red-400'
                      : daysUntilNext <= 7
                      ? 'text-orange-400'
                      : 'text-green-400'
                  }`}>
                    {daysUntilNext < 0
                      ? t('payments.overdueDays', { days: Math.abs(daysUntilNext) })
                      : daysUntilNext === 0
                      ? t('payments.dueToday')
                      : t('payments.daysLeft', { days: daysUntilNext })
                    }
                  </p>
                )}
              </div>
            </div>

            {daysUntilNext !== null && daysUntilNext <= 7 && (
              <div className={`mt-4 p-4 rounded-lg ${
                daysUntilNext < 0
                  ? 'bg-red-500/20 border border-red-500/30'
                  : 'bg-orange-500/20 border border-orange-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    daysUntilNext < 0 ? 'text-red-400' : 'text-orange-400'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      daysUntilNext < 0 ? 'text-red-300' : 'text-orange-300'
                    }`}>
                      {daysUntilNext < 0
                        ? t('payments.expired')
                        : t('payments.expiring')
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('payments.renewHint')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sin Plan */}
      {!client.subscription && (
        <Card className="border-2 border-border bg-card">
          <CardContent className="py-12 text-center">
            <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {t('payments.noPlan')}
            </h3>
            <p className="text-muted-foreground">
              {t('payments.noPlanHint')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Historial de Pagos */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-brand" />
            {t('payments.history')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-border transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        {getPaymentStatusBadge(payment.status)}
                      </div>

                      {payment.subscription && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {t('payments.planLabel', { name: payment.subscription.plan.name })}
                        </p>
                      )}

                      {payment.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {payment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t('payments.due', { date: formatDate(payment.dueDate) })}
                        </div>
                        {payment.paidAt && (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            {t('payments.paidOn', { date: formatDate(payment.paidAt) })}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {payment.paymentMethod === 'bank_transfer' && t('payments.method.bank')}
                          {payment.paymentMethod === 'credit_card' && t('payments.method.card')}
                          {payment.paymentMethod === 'cash' && t('payments.method.cash')}
                          {payment.paymentMethod === 'manual' && t('payments.method.manual')}
                          {payment.paymentMethod === 'paypal' && t('payments.method.paypal')}
                          {payment.paymentMethod === 'other' && t('payments.method.other')}
                          {payment.paymentMethod === 'pending' && t('payments.method.pending')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(payment.status === 'pending' || payment.status === 'failed') &&
                        paypalEnabled &&
                        paypalCurrencies.includes(payment.currency) && (
                          <Button
                            size="sm"
                            onClick={() => payWithPaypal(payment.id)}
                            disabled={paying === payment.id}
                            className="bg-brand text-white hover:brightness-[1.07]"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            {paying === payment.id ? t('payments.redirecting') : t('payments.paypal')}
                          </Button>
                        )}
                      {payment.receiptUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(payment.receiptUrl!, '_blank')}
                          className="border-brand text-brand hover:bg-brand hover:text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('payments.receipt')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t('payments.empty')}
              </h3>
              <p className="text-muted-foreground">
                {t('payments.emptyHint')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
