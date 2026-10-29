'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PlusIcon, PencilIcon, PowerIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { showToast } from '@/components/ui/toast'

export interface AdminCreditPack {
  id: string
  name: string
  description: string | null
  creditType: string
  amount: number
  price: number
  currency: string
  isActive: boolean
  order: number
}

export interface AdminCreditRequest {
  id: string
  clientName: string
  clientEmail: string
  packName: string
  creditType: string
  amount: number
  price: number
  currency: string
  createdAt: string
}

export interface AdminCreditClient {
  id: string
  name: string
  email: string
}

export interface AdminCreditGrant {
  id: string
  clientName: string
  packName: string
  characters: number
  musicSeconds: number
  remainingCharacters: number
  remainingMusicSeconds: number
  source: string
  createdAt: string
}

interface Props {
  packs: AdminCreditPack[]
  requests: AdminCreditRequest[]
  clients: AdminCreditClient[]
  grants: AdminCreditGrant[]
}

function formatCurrency(amount: number, currency: string, locale: 'es' | 'en') {
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'CLP' ? 0 : 2,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

function formatDate(value: string, locale: 'es' | 'en') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatMusic(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`
}

export function AiCreditPacksAdminView({ packs, requests, clients, grants }: Props) {
  const { t, locale } = useDashboardI18n()
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creditType, setCreditType] = useState<'characters' | 'music'>('characters')
  const [amount, setAmount] = useState('500')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [order, setOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [saleRequest, setSaleRequest] = useState<AdminCreditRequest | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [directClientId, setDirectClientId] = useState('')
  const [directPackId, setDirectPackId] = useState('')
  const [directMethod, setDirectMethod] = useState('bank_transfer')
  const [directPaidAt, setDirectPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [directNote, setDirectNote] = useState('')
  const [sellingDirect, setSellingDirect] = useState(false)

  const activePacks = packs.filter((pack) => pack.isActive)

  function resetPackForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setCreditType('characters')
    setAmount('500')
    setPrice('')
    setCurrency('CLP')
    setOrder('0')
  }

  function startEdit(pack: AdminCreditPack) {
    setEditingId(pack.id)
    setName(pack.name)
    setDescription(pack.description ?? '')
    setCreditType(pack.creditType === 'music' ? 'music' : 'characters')
    setAmount(String(pack.amount))
    setPrice(String(pack.price))
    setCurrency(pack.currency)
    setOrder(String(pack.order))
  }

  async function savePack(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        creditType,
        amount: Number(amount),
        price: Number(price),
        currency: currency.trim().toUpperCase(),
        order: Number(order) || 0,
      }
      const response = await fetch(editingId ? `/api/admin/ai-credit-packs/${editingId}` : '/api/admin/ai-credit-packs', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('adminAiPacks.saveError'))
      showToast({ type: 'success', title: editingId ? t('adminAiPacks.updated') : t('adminAiPacks.created') })
      resetPackForm()
      router.refresh()
    } catch (error) {
      showToast({ type: 'error', title: error instanceof Error ? error.message : t('adminAiPacks.saveError') })
    } finally {
      setSaving(false)
    }
  }

  async function togglePack(pack: AdminCreditPack) {
    try {
      const response = await fetch(`/api/admin/ai-credit-packs/${pack.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pack.name,
          description: pack.description,
          creditType: pack.creditType,
          amount: pack.amount,
          price: pack.price,
          currency: pack.currency,
          order: pack.order,
          isActive: !pack.isActive,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('adminAiPacks.saveError'))
      router.refresh()
    } catch (error) {
      showToast({ type: 'error', title: error instanceof Error ? error.message : t('adminAiPacks.saveError') })
    }
  }

  async function resolveRequest(action: 'approve' | 'reject', request = saleRequest) {
    if (!request) return
    try {
      const response = await fetch(`/api/admin/ai-credit-requests/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          paymentMethod: action === 'approve' ? paymentMethod : undefined,
          paidAt: action === 'approve' ? paidAt : undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('adminAiPacks.saleError'))
      showToast({
        type: 'success',
        title: action === 'approve' ? t('adminAiPacks.saleDone') : t('adminAiPacks.rejectDone'),
      })
      if (action === 'approve') setSaleRequest(null)
      router.refresh()
    } catch (error) {
      showToast({ type: 'error', title: error instanceof Error ? error.message : t('adminAiPacks.saleError') })
    }
  }

  async function rejectRequest(request: AdminCreditRequest) {
    if (!confirm(t('adminAiPacks.rejectConfirm'))) return
    await resolveRequest('reject', request)
  }

  async function sellDirect(event: React.FormEvent) {
    event.preventDefault()
    if (!directClientId || !directPackId) {
      showToast({ type: 'error', title: t('adminAiPacks.selectRequired') })
      return
    }
    setSellingDirect(true)
    try {
      const response = await fetch('/api/admin/ai-credit-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: directClientId,
          packId: directPackId,
          paymentMethod: directMethod,
          paidAt: directPaidAt,
          note: directNote.trim() || undefined,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || t('adminAiPacks.saleError'))
      showToast({ type: 'success', title: t('adminAiPacks.saleDone') })
      setDirectClientId('')
      setDirectPackId('')
      setDirectNote('')
      router.refresh()
    } catch (error) {
      showToast({ type: 'error', title: error instanceof Error ? error.message : t('adminAiPacks.saleError') })
    } finally {
      setSellingDirect(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('adminAiPacks.catalogTitle')}</h2>
        <form onSubmit={savePack} className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="form-input" placeholder={t('adminAiPacks.name')} value={name} onChange={(event) => setName(event.target.value)} />
          <input className="form-input" placeholder={t('adminAiPacks.description')} value={description} onChange={(event) => setDescription(event.target.value)} />
          <select className="form-input" value={creditType} onChange={(event) => setCreditType(event.target.value === 'music' ? 'music' : 'characters')}>
            <option value="characters">{t('adminAiPacks.types.characters')}</option>
            <option value="music">{t('adminAiPacks.types.music')}</option>
          </select>
          <input className="form-input" type="number" min="1" placeholder={t('adminAiPacks.amount')} value={amount} onChange={(event) => setAmount(event.target.value)} />
          <input className="form-input" type="number" min="0" step="0.01" placeholder={t('adminAiPacks.price')} value={price} onChange={(event) => setPrice(event.target.value)} />
          <input className="form-input" placeholder={t('adminAiPacks.currency')} value={currency} onChange={(event) => setCurrency(event.target.value)} />
          <input className="form-input" type="number" placeholder={t('adminAiPacks.order')} value={order} onChange={(event) => setOrder(event.target.value)} />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <PlusIcon className="h-4 w-4" />
              {saving ? t('common.saving') : editingId ? t('adminAiPacks.saveChanges') : t('adminAiPacks.add')}
            </button>
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetPackForm}>
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3">{t('adminAiPacks.name')}</th>
                <th className="pb-2 pr-3">{t('adminAiPacks.type')}</th>
                <th className="pb-2 pr-3">{t('adminAiPacks.amount')}</th>
                <th className="pb-2 pr-3">{t('adminAiPacks.price')}</th>
                <th className="pb-2 pr-3">{t('adminAiPacks.status')}</th>
                <th className="pb-2 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <tr key={pack.id} className="border-b border-border/60 text-foreground">
                  <td className="py-2 pr-3">{pack.name}</td>
                  <td className="py-2 pr-3">{pack.creditType === 'music' ? t('adminAiPacks.types.music') : t('adminAiPacks.types.characters')}</td>
                  <td className="py-2 pr-3 font-mono">{pack.amount}</td>
                  <td className="py-2 pr-3">{formatCurrency(pack.price, pack.currency, locale)}</td>
                  <td className="py-2 pr-3">{pack.isActive ? t('adminAiPacks.active') : t('adminAiPacks.inactive')}</td>
                  <td className="py-2 text-right">
                    <button type="button" className="action-button action-button-edit mr-2" onClick={() => startEdit(pack)} title={t('common.edit')}>
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button type="button" className="action-button" onClick={() => void togglePack(pack)} title={pack.isActive ? t('adminAiPacks.deactivate') : t('adminAiPacks.activate')}>
                      <PowerIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('adminAiPacks.requestsTitle')}</h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('adminAiPacks.noRequests')}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">{t('adminAiPacks.client')}</th>
                  <th className="pb-2 pr-3">{t('adminAiPacks.pack')}</th>
                  <th className="pb-2 pr-3">{t('adminAiPacks.price')}</th>
                  <th className="pb-2 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-border/60 text-foreground">
                    <td className="py-2 pr-3">{request.clientName}<span className="block text-xs text-muted-foreground">{request.clientEmail}</span></td>
                    <td className="py-2 pr-3">{request.packName}</td>
                    <td className="py-2 pr-3 font-mono">{formatCurrency(request.price, request.currency, locale)}</td>
                    <td className="py-2 text-right">
                      <button type="button" className="btn-primary mr-2 text-xs" onClick={() => setSaleRequest(request)}>
                        {t('adminAiPacks.approve')}
                      </button>
                      <button type="button" className="btn-secondary text-xs" onClick={() => void rejectRequest(request)}>
                        {t('adminAiPacks.reject')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('adminAiPacks.directTitle')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('adminAiPacks.directHint')}</p>
        <form onSubmit={sellDirect} className="mt-4 grid gap-3 md:grid-cols-2">
          <select className="form-input" value={directClientId} onChange={(event) => setDirectClientId(event.target.value)}>
            <option value="">{t('adminAiPacks.selectClient')}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name} ({client.email})</option>
            ))}
          </select>
          <select className="form-input" value={directPackId} onChange={(event) => setDirectPackId(event.target.value)}>
            <option value="">{t('adminAiPacks.selectPack')}</option>
            {activePacks.map((pack) => (
              <option key={pack.id} value={pack.id}>{pack.name} — {formatCurrency(pack.price, pack.currency, locale)}</option>
            ))}
          </select>
          <select className="form-input" value={directMethod} onChange={(event) => setDirectMethod(event.target.value)}>
            <option value="bank_transfer">{t('admin.clients.paymentMethod.bank_transfer')}</option>
            <option value="credit_card">{t('admin.clients.paymentMethod.credit_card')}</option>
            <option value="cash">{t('admin.clients.paymentMethod.cash')}</option>
            <option value="paypal">{t('admin.clients.paymentMethod.paypal')}</option>
            <option value="other">{t('admin.clients.paymentMethod.other')}</option>
          </select>
          <input className="form-input" type="date" value={directPaidAt} onChange={(event) => setDirectPaidAt(event.target.value)} />
          <input className="form-input md:col-span-2" placeholder={t('adminAiPacks.note')} value={directNote} onChange={(event) => setDirectNote(event.target.value)} />
          <div>
            <button type="submit" disabled={sellingDirect} className="btn-primary text-xs disabled:opacity-50">
              {sellingDirect ? t('adminAiPacks.selling') : t('adminAiPacks.sell')}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('adminAiPacks.grantsTitle')}</h2>
        {grants.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('adminAiPacks.noGrants')}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">{t('adminAiPacks.client')}</th>
                  <th className="pb-2 pr-3">{t('adminAiPacks.pack')}</th>
                  <th className="pb-2 pr-3">{t('adminAiPacks.granted')}</th>
                  <th className="pb-2 pr-3">{t('adminAiPacks.remaining')}</th>
                  <th className="pb-2">{t('adminAiPacks.date')}</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id} className="border-b border-border/60 text-foreground">
                    <td className="py-2 pr-3">{grant.clientName}</td>
                    <td className="py-2 pr-3">{grant.packName}</td>
                    <td className="py-2 pr-3 font-mono">
                      {grant.characters > 0 ? `${grant.characters} ${t('adminAiPacks.types.characters')}` : formatMusic(grant.musicSeconds)}
                    </td>
                    <td className="py-2 pr-3 font-mono">
                      {grant.characters > 0
                        ? `${grant.remainingCharacters} ${t('adminAiPacks.types.characters')}`
                        : formatMusic(grant.remainingMusicSeconds)}
                    </td>
                    <td className="py-2">{formatDate(grant.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {saleRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-container border border-border bg-card p-5 ">
            <h3 className="text-lg font-semibold text-foreground">{t('adminAiPacks.approve')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {saleRequest.clientName} · {saleRequest.packName} · {formatCurrency(saleRequest.price, saleRequest.currency, locale)}
            </p>
            <div className="mt-4 space-y-3">
              <select className="form-input w-full" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="bank_transfer">{t('admin.clients.paymentMethod.bank_transfer')}</option>
                <option value="credit_card">{t('admin.clients.paymentMethod.credit_card')}</option>
                <option value="cash">{t('admin.clients.paymentMethod.cash')}</option>
                <option value="paypal">{t('admin.clients.paymentMethod.paypal')}</option>
                <option value="other">{t('admin.clients.paymentMethod.other')}</option>
              </select>
              <input className="form-input w-full" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSaleRequest(null)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" onClick={() => void resolveRequest('approve')}>{t('adminAiPacks.confirmSale')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
