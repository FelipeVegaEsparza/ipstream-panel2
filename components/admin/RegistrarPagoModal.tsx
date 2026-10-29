'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHODS } from '@/lib/billing-format'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t } = useDashboardI18n()
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [description, setDescription] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const methodLabel = (value: string, fallback: string) =>
    value === 'bank_transfer'
      ? t('admin.clients.paymentMethod.bank_transfer')
      : value === 'credit_card'
      ? t('admin.clients.paymentMethod.credit_card')
      : value === 'cash'
      ? t('admin.clients.paymentMethod.cash')
      : value === 'paypal'
      ? t('admin.clients.paymentMethod.paypal')
      : value === 'other'
      ? t('admin.clients.paymentMethod.other')
      : fallback

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
        throw new Error(data.error || t('admin.registerPayment.registerError'))
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
      setError(err instanceof Error ? err.message : t('admin.registerPayment.registerError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 " onClick={onClose} />
      <div className="relative bg-card rounded-container  border border-border max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-foreground">{t('admin.registerPayment.title')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('admin.registerPayment.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-secondary/40 border border-border">
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.registerPayment.client')}</p>
              <p className="text-foreground font-medium">{clientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.registerPayment.plan')}</p>
              <p className="text-foreground font-medium">{planName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.registerPayment.amount')}</p>
              <p className="text-brand font-bold text-lg">{formatCurrency(amount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin.registerPayment.paymentDate')}</p>
              <p className="text-foreground font-medium">{formatDate(paidAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('admin.registerPayment.paymentDateLabel')}</label>
              <Input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">{t('admin.registerPayment.method')}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {methodLabel(m.value, m.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('admin.registerPayment.description')}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('admin.registerPayment.descriptionPlaceholder')}
              className="bg-secondary border-border text-foreground"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('admin.registerPayment.receipt')}</label>
            {!receipt ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg hover:border-brand transition-colors flex flex-col items-center justify-center"
              >
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">{t('admin.registerPayment.uploadHint')}</span>
              </button>
            ) : (
              <div className="border border-border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {preview ? (
                    <ImageIcon className="h-5 w-5 text-brand" />
                  ) : (
                    <FileText className="h-5 w-5 text-red-400" />
                  )}
                  <span className="text-sm text-foreground truncate max-w-[240px]">{receipt.name}</span>
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
              className="flex-1 border-border hover:bg-secondary"
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? t('admin.registerPayment.registering') : t('admin.registerPayment.register')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
