'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { showToast } from '@/components/ui/toast'
import { PlusIcon, PencilIcon, TrashIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface GcBarMessage {
  id: string
  text: string
  order: number
  createdAt: Date | string
}

interface GcBarManagerProps {
  messages: GcBarMessage[]
}

export function GcBarManager({ messages }: GcBarManagerProps) {
  const { t } = useDashboardI18n()
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [order, setOrder] = useState('0')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const reset = () => {
    setEditingId(null)
    setText('')
    setOrder('0')
  }

  const startEdit = (message: GcBarMessage) => {
    setEditingId(message.id)
    setText(message.text)
    setOrder(String(message.order))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) {
      showToast({ type: 'error', title: t('gcbar.required') })
      return
    }
    setSaving(true)
    try {
      const payload = { text: text.trim(), order: Number(order) || 0 }
      const response = await fetch(editingId ? `/api/gc-bar/${editingId}` : '/api/gc-bar', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        showToast({ type: 'error', title: data?.error || t('gcbar.saveError') })
        return
      }
      showToast({ type: 'success', title: editingId ? t('gcbar.saved') : t('gcbar.added') })
      reset()
      router.refresh()
    } catch (error) {
      showToast({ type: 'error', title: t('gcbar.saveError') })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t('gcbar.deleteConfirm'))) return
    setLoading(id)
    try {
      const response = await fetch(`/api/gc-bar/${id}`, { method: 'DELETE' })
      if (response.ok) {
        if (editingId === id) reset()
        showToast({ type: 'success', title: t('gcbar.deleted') })
        router.refresh()
      } else {
        showToast({ type: 'error', title: t('gcbar.deleteError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('gcbar.deleteError') })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {editingId ? t('gcbar.edit') : t('gcbar.new')}
        </h2>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">{t('gcbar.message')}</label>
          <textarea
            className="form-input w-full resize-none"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('gcbar.messagePlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">{t('gcbar.order')}</label>
          <input
            type="number"
            className="form-input w-full max-w-xs"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('gcbar.orderHint')}</p>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <PlusIcon className="h-4 w-4" />
            {saving ? t('common.saving') : editingId ? t('gcbar.saveChanges') : t('gcbar.add')}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn-secondary">
              {t('common.cancel')}
            </button>
          )}
        </div>
      </form>

      {messages.length === 0 ? (
        <div className="text-center py-12">
          <Bars3BottomLeftIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t('gcbar.empty')}</h3>
          <p className="text-muted-foreground">{t('gcbar.emptyHint')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`card flex items-start justify-between gap-4 ${editingId === message.id ? 'ring-1 ring-brand' : ''}`}
            >
              <div className="min-w-0">
                <span className="text-xs font-mono text-muted-foreground">#{message.order}</span>
                <p className="text-foreground whitespace-pre-wrap break-words">{message.text}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startEdit(message)}
                  className="action-button action-button-edit"
                  title={t('common.edit')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(message.id)}
                  disabled={loading === message.id}
                  className="action-button action-button-delete"
                  title={t('common.delete')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
