'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { formatCurrency } from '@/lib/billing-format'

export interface PlanOption {
  id: string
  name: string
  price: number
  currency: string
  interval: string
  description: string
}

export interface AsignarPlanModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  clientId: string
  clientName: string
  plans: PlanOption[]
  currentPlanId?: string | null
}

export function AsignarPlanModal({
  open,
  onClose,
  onSuccess,
  clientId,
  clientName,
  plans,
  currentPlanId,
}: AsignarPlanModalProps) {
  const [planId, setPlanId] = useState<string>(
    plans.find((p) => p.id !== currentPlanId)?.id ?? plans[0]?.id ?? ''
  )
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async () => {
    if (!planId) {
      setError('Selecciona un plan')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/clients/assign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          planId,
          startDate: new Date(startDate).toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al asignar plan')
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-foreground">Asignar plan</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cliente: <span className="text-foreground font-medium">{clientName}</span>
            </p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-2">Plan *</label>
            <div className="space-y-2">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlanId
                return (
                  <label
                    key={plan.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      planId === plan.id
                        ? 'border-brand bg-brand/10'
                        : 'border-border bg-secondary/40 hover:bg-secondary/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={planId === plan.id}
                      onChange={() => setPlanId(plan.id)}
                      className="accent-cyan-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{plan.name}</span>
                        {isCurrent && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-brand font-bold">
                        {formatCurrency(plan.price, plan.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{plan.interval === 'monthly' ? 'mes' : 'año'}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
            {plans.length === 0 && (
              <p className="text-sm text-orange-400 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                No hay planes activos. Crea uno en la pestaña "Planes".
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Fecha de inicio *</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              La suscripción y los pagos mensuales se generarán a partir de esta fecha.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-border hover:bg-secondary"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-brand hover:bg-brand"
              disabled={loading || plans.length === 0}
            >
              {loading ? 'Asignando...' : 'Asignar plan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
