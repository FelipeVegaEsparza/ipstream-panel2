'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, DollarSign, AlertTriangle, CheckCircle2, Clock, X, Sparkles } from 'lucide-react'
import {
  getClientPaymentStatus,
  type ClientPayment,
  type ClientSubscriptionLite,
} from '@/lib/payment-status'
import { formatCurrency, formatDate } from '@/lib/billing-format'
import {
  ClienteRow,
  type ClienteRowData,
} from './ClienteRow'
import { AsignarPlanModal, type PlanOption } from './AsignarPlanModal'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export interface ClientesTableProps {
  clients: ClienteRowData[]
  plans: PlanOption[]
}

type StatusFilter = 'all' | 'overdue' | 'due_soon' | 'current' | 'no_plan' | 'trial'
type IntervalFilter = 'all' | 'monthly' | 'yearly'

export function ClientesTable({ clients, plans }: ClientesTableProps) {
  const { t } = useDashboardI18n()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [intervalFilter, setIntervalFilter] = useState<IntervalFilter>('all')
  const [asignarClient, setAsignarClient] = useState<ClienteRowData | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const enriched = useMemo(() => {
    return clients.map((c) => ({
      ...c,
      statusResult: getClientPaymentStatus(c.plan !== null, c.subscription, c.payments),
    }))
  }, [clients])

  const stats = useMemo(() => {
    const withPlan = enriched.filter((c) => c.plan !== null)
    return {
      overdue: enriched.filter((c) => c.statusResult.status === 'overdue').length,
      dueSoon: enriched.filter((c) => c.statusResult.status === 'due_soon').length,
      current: enriched.filter((c) => c.statusResult.status === 'current').length,
      noPlan: enriched.filter((c) => c.statusResult.status === 'no_plan').length,
      trial: enriched.filter((c) => c.statusResult.status === 'trial').length,
      monthly: withPlan.filter((c) => c.plan?.interval === 'monthly').length,
      yearly: withPlan.filter((c) => c.plan?.interval === 'yearly').length,
    }
  }, [enriched])

  const filtered = enriched.filter((c) => {
    const matchSearch =
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false
    if (filter === 'overdue' && c.statusResult.status !== 'overdue') return false
    if (filter === 'due_soon' && c.statusResult.status !== 'due_soon') return false
    if (filter === 'current' && c.statusResult.status !== 'current') return false
    if (filter === 'no_plan' && c.statusResult.status !== 'no_plan') return false
    if (filter === 'trial' && c.statusResult.status !== 'trial') return false
    if (intervalFilter === 'monthly' && c.plan?.interval !== 'monthly') return false
    if (intervalFilter === 'yearly' && c.plan?.interval !== 'yearly') return false
    return true
  })

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleQuitarPlan = async (client: ClienteRowData) => {
    if (!confirm(t('admin.clients.removePlanConfirm', { name: client.name }))) return
    try {
      const res = await fetch('/api/admin/clients/remove-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('admin.clients.removePlanError'))
      }
      showFeedback('success', t('admin.clients.planRemoved'))
      setTimeout(() => router.refresh(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : t('admin.clients.removePlanError'))
    }
  }

  const handleRenovar = async (client: ClienteRowData) => {
    if (!client.subscription) return
    if (!confirm(t('admin.clients.renewConfirm', { name: client.name }))) return
    try {
      const res = await fetch(`/api/admin/subscriptions/${client.subscription.id}/renew`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('admin.clients.renewError'))
      }
      showFeedback('success', t('admin.clients.renewed'))
      setTimeout(() => router.refresh(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : t('admin.clients.renewError'))
    }
  }

  const handleCancelar = async (client: ClienteRowData) => {
    if (!client.subscription) return
    if (!confirm(t('admin.clients.cancelConfirm', { name: client.name }))) return
    try {
      const res = await fetch(`/api/admin/subscriptions/${client.subscription.id}/cancel`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('admin.clients.cancelError'))
      }
      showFeedback('success', t('admin.clients.cancelled'))
      setTimeout(() => router.refresh(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : t('admin.clients.cancelError'))
    }
  }

  const handleMarkPaymentPaid = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('admin.clients.markPaidError'))
      }
      showFeedback('success', t('admin.clients.markedPaid'))
      setTimeout(() => router.refresh(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : t('admin.clients.error'))
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={AlertTriangle} color="red" label={t('admin.clients.overdue')} value={stats.overdue} />
        <StatCard icon={Sparkles} color="cyan" label={t('admin.clients.trial')} value={stats.trial} />
        <StatCard icon={Clock} color="orange" label={t('admin.clients.dueSoon')} value={stats.dueSoon} />
        <StatCard icon={CheckCircle2} color="green" label={t('admin.clients.current')} value={stats.current} />
        <StatCard icon={X} color="gray" label={t('admin.clients.noPlan')} value={stats.noPlan} />
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-foreground">{t('admin.clients.title')}</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.clients.search')}
              className="bg-secondary border-border text-foreground pl-10 w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap items-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide mr-1">{t('admin.clients.status')}</span>
            {[
              { key: 'all' as const, label: t('admin.clients.all'), count: enriched.length },
              { key: 'trial' as const, label: t('admin.clients.trial'), count: stats.trial },
              { key: 'overdue' as const, label: t('admin.clients.overdue'), count: stats.overdue },
              { key: 'due_soon' as const, label: t('admin.clients.dueSoon'), count: stats.dueSoon },
              { key: 'current' as const, label: t('admin.clients.current'), count: stats.current },
              { key: 'no_plan' as const, label: t('admin.clients.noPlan'), count: stats.noPlan },
            ].map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? 'bg-brand hover:bg-brand'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }
              >
                {f.label} ({f.count})
              </Button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center mb-4">
            <span className="text-xs text-muted-foreground uppercase tracking-wide mr-1">{t('admin.clients.planFilter')}</span>
            {[
              { key: 'all' as const, label: t('admin.clients.all'), count: enriched.length },
              { key: 'monthly' as const, label: t('admin.clients.monthly'), count: stats.monthly },
              { key: 'yearly' as const, label: t('admin.clients.yearly'), count: stats.yearly },
            ].map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={intervalFilter === f.key ? 'default' : 'outline'}
                onClick={() => setIntervalFilter(f.key)}
                className={
                  intervalFilter === f.key
                    ? 'bg-brand hover:bg-brand'
                    : 'border-border hover:bg-secondary text-muted-foreground'
                }
              >
                {f.label} ({f.count})
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {clients.length === 0
                ? t('admin.clients.empty')
                : t('admin.clients.noMatches')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="px-4 py-2 font-medium">{t('admin.clients.client')}</th>
                    <th className="px-4 py-2 font-medium">{t('admin.clients.plan')}</th>
                    <th className="px-4 py-2 font-medium">{t('admin.clients.statusLabel')}</th>
                    <th className="px-4 py-2 font-medium">{t('admin.clients.nextPayment')}</th>
                    <th className="px-4 py-2 font-medium">{t('admin.clients.lastPayment')}</th>
                    <th className="px-4 py-2 font-medium">{t('admin.clients.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <ClienteRow
                      key={c.id}
                      client={c}
                      onAsignarPlan={(cli) => setAsignarClient(cli)}
                      onQuitarPlan={handleQuitarPlan}
                      onRenovar={handleRenovar}
                      onCancelar={handleCancelar}
                      onMarkPaymentPaid={handleMarkPaymentPaid}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {asignarClient && (
        <AsignarPlanModal
          open={true}
          onClose={() => setAsignarClient(null)}
          onSuccess={() => {
            setAsignarClient(null)
            router.refresh()
          }}
          clientId={asignarClient.id}
          clientName={asignarClient.name}
          plans={plans}
          currentPlanId={asignarClient.plan?.id ?? null}
        />
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof AlertTriangle
  color: 'red' | 'orange' | 'green' | 'gray' | 'cyan'
  label: string
  value: number
}) {
  const colors = {
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    gray: 'border-border/30 bg-secondary/10 text-muted-foreground',
    cyan: 'border-brand/30 bg-brand/10 text-brand',
  }
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6" />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs opacity-80">{label}</p>
        </div>
      </div>
    </div>
  )
}
