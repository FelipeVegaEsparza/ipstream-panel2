'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '@/lib/billing-format'

export interface RegistrarPagoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  subscriptionId: string
  clientName: string
  planName: string
  amount: number
  currency: string
}

export function RegistrarPagoModal({
  open,
  onClose,
  onSuccess,
  subscriptionId,
  clientName,
  planName,
  amount,
  currency,
}: RegistrarPagoModalProps) {
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [description, setDescription] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFile = (file: File) => {
    setReceipt(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          amount,
          currency,
          paymentMethod,
          description: description || undefined,
          paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al registrar pago')
      }

      const data = await res.json()
      const paymentId = data.payment?.id

      if (receipt && paymentId) {
        const formData = new FormData()
        formData.append('receipt', receipt)
        await fetch(`/api/admin/payments/${paymentId}/upload-receipt`, {
          method: 'POST',
          body: formData,
        })
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-white">Registrar pago</h3>
            <p className="text-sm text-gray-400 mt-1">
              Marca como pagado el ciclo actual y genera el siguiente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-700/40 border border-gray-600">
            <div>
              <p className="text-xs text-gray-400">Cliente</p>
              <p className="text-white font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Plan</p>
              <p className="text-white font-medium">{planName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Monto</p>
              <p className="text-cyan-400 font-bold text-lg">{formatCurrency(amount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Fecha del pago</p>
              <p className="text-white font-medium">{formatDate(paidAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Fecha del pago *</label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Método de pago</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Descripción (opcional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago del mes de julio"
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Comprobante (opcional)</label>
            {!receipt ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-gray-600 rounded-lg hover:border-cyan-500 transition-colors flex flex-col items-center justify-center"
              >
                <Upload className="h-6 w-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-400">Subir imagen o PDF (máx 10MB)</span>
              </button>
            ) : (
              <div className="border border-gray-600 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {preview ? (
                    <ImageIcon className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-red-400" />
                  )}
                  <span className="text-sm text-white truncate max-w-[240px]">{receipt.name}</span>
                </div>
                <button
                  onClick={() => {
                    setReceipt(null)
                    setPreview(null)
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
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
              className="flex-1 border-gray-600 hover:bg-gray-700"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar pago'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
