'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Calendar, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/billing-format'

export interface EditarFechaInicioModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  subscriptionId: string
  clientName: string
  currentStartDate: Date | string
}

export function EditarFechaInicioModal({
  open,
  onClose,
  onSuccess,
  subscriptionId,
  clientName,
  currentStartDate,
}: EditarFechaInicioModalProps) {
  const [startDate, setStartDate] = useState(
    new Date(currentStartDate).toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async () => {
    if (!startDate) {
      setError('Selecciona una fecha')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: new Date(startDate).toISOString() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al actualizar fecha')
      }
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar fecha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand" />
              Editar fecha de inicio
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cliente: <span className="text-foreground font-medium">{clientName}</span>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-secondary/40 border border-border">
            <p className="text-xs text-muted-foreground">Fecha de inicio actual</p>
            <p className="text-foreground font-medium">{formatDate(currentStartDate)}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">Nueva fecha de inicio *</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Se regenerarán todos los pagos mensuales desde esta fecha. El primer mes quedará
              marcado como pagado automáticamente.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-200">
              <strong>Atención:</strong> esta acción elimina todos los pagos existentes
              (pagados y pendientes) de esta suscripción y los regenera desde la nueva fecha.
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
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar fecha'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
