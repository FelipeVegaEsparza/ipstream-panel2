'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, DollarSign, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react'
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

export interface ClientesTableProps {
  clients: ClienteRowData[]
  plans: PlanOption[]
}

type StatusFilter = 'all' | 'overdue' | 'due_soon' | 'current' | 'no_plan'
type IntervalFilter = 'all' | 'monthly' | 'yearly'

export function ClientesTable({ clients, plans }: ClientesTableProps) {
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
    if (intervalFilter === 'monthly' && c.plan?.interval !== 'monthly') return false
    if (intervalFilter === 'yearly' && c.plan?.interval !== 'yearly') return false
    return true
  })

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleQuitarPlan = async (client: ClienteRowData) => {
    if (!confirm(`¿Quitar el plan de "${client.name}"? Se eliminarán todas sus suscripciones y pagos.`)) return
    try {
      const res = await fetch('/api/admin/clients/remove-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al quitar plan')
      }
      showFeedback('success', 'Plan quitado')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Error al quitar plan')
    }
  }

  const handleRenovar = async (client: ClienteRowData) => {
    if (!client.subscription) return
    if (!confirm(`¿Renovar la suscripción de "${client.name}"? Se creará un nuevo pago pendiente.`)) return
    try {
      const res = await fetch(`/api/admin/subscriptions/${client.subscription.id}/renew`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al renovar')
      }
      showFeedback('success', 'Suscripción renovada')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Error al renovar')
    }
  }

  const handleCancelar = async (client: ClienteRowData) => {
    if (!client.subscription) return
    if (!confirm(`¿Cancelar la suscripción de "${client.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/subscriptions/${client.subscription.id}/cancel`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al cancelar')
      }
      showFeedback('success', 'Suscripción cancelada')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Error al cancelar')
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
        throw new Error(data.error || 'Error al marcar como pagado')
      }
      showFeedback('success', 'Pago marcado como pagado')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Error')
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} color="red" label="Vencidos" value={stats.overdue} />
        <StatCard icon={Clock} color="orange" label="Por vencer" value={stats.dueSoon} />
        <StatCard icon={CheckCircle2} color="green" label="Al día" value={stats.current} />
        <StatCard icon={X} color="gray" label="Sin plan" value={stats.noPlan} />
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-white">Clientes y pagos</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o email..."
              className="bg-gray-700 border-gray-600 text-white pl-10 w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap items-center mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">Estado:</span>
            {[
              { key: 'all' as const, label: 'Todos', count: enriched.length },
              { key: 'overdue' as const, label: 'Vencidos', count: stats.overdue },
              { key: 'due_soon' as const, label: 'Por vencer', count: stats.dueSoon },
              { key: 'current' as const, label: 'Al día', count: stats.current },
              { key: 'no_plan' as const, label: 'Sin plan', count: stats.noPlan },
            ].map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'border-gray-600 hover:bg-gray-700 text-gray-300'
                }
              >
                {f.label} ({f.count})
              </Button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap items-center mb-4">
            <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">Plan:</span>
            {[
              { key: 'all' as const, label: 'Todos', count: enriched.length },
              { key: 'monthly' as const, label: 'Mensuales', count: stats.monthly },
              { key: 'yearly' as const, label: 'Anuales', count: stats.yearly },
            ].map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={intervalFilter === f.key ? 'default' : 'outline'}
                onClick={() => setIntervalFilter(f.key)}
                className={
                  intervalFilter === f.key
                    ? 'bg-cyan-600 hover:bg-cyan-700'
                    : 'border-gray-600 hover:bg-gray-700 text-gray-300'
                }
              >
                {f.label} ({f.count})
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">
              {clients.length === 0
                ? 'No hay clientes registrados todavía.'
                : 'Ningún cliente coincide con los filtros.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Plan</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                    <th className="px-4 py-2 font-medium">Próx. pago</th>
                    <th className="px-4 py-2 font-medium">Últ. pago</th>
                    <th className="px-4 py-2 font-medium">Acciones</th>
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
            window.location.reload()
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
  color: 'red' | 'orange' | 'green' | 'gray'
  label: string
  value: number
}) {
  const colors = {
    red: 'border-red-500/30 bg-red-500/10 text-red-400',
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    gray: 'border-gray-500/30 bg-gray-500/10 text-gray-400',
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
