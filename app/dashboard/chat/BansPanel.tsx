'use client'

import { useState } from 'react'
import { ShieldOff, Plus, Ban as BanIcon, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import type { ChatBan } from './ChatView'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface BansPanelProps {
  bans: ChatBan[]
  onAdd: (data: { email?: string; ipAddress?: string; reason?: string }) => Promise<ChatBan | null>
  onRemove: (id: string) => Promise<boolean>
  onError: (msg: string | null) => void
}

export function BansPanel({ bans, onAdd, onRemove, onError }: BansPanelProps) {
  const { t, locale } = useDashboardI18n()
  const [email, setEmail] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!email.trim() && !ipAddress.trim()) {
      onError(t('chat.bans.required'))
      return
    }
    setSubmitting(true)
    onError(null)
    const data: { email?: string; ipAddress?: string; reason?: string } = {}
    if (email.trim()) data.email = email.trim()
    if (ipAddress.trim()) data.ipAddress = ipAddress.trim()
    if (reason.trim()) data.reason = reason.trim()
    const result = await onAdd(data)
    setSubmitting(false)
    if (result) {
      setEmail('')
      setIpAddress('')
      setReason('')
    }
  }

  const handleRemove = async (id: string) => {
    await onRemove(id)
    setConfirmId(null)
  }

  return (
  <div className="bg-card border border-border rounded-panel ">
      <div className="p-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <BanIcon className="h-4 w-4 text-destructive" />
          {t('chat.bans.title')}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t('chat.bans.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-b border-border space-y-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('chat.bans.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('chat.bans.emailPlaceholder')}
            maxLength={120}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('chat.bans.ip')}</label>
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            placeholder="192.168.1.1"
            maxLength={45}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none font-mono"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{t('chat.bans.reason')}</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('chat.bans.reasonPlaceholder')}
            maxLength={200}
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-brand focus:outline-none"
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || (!email.trim() && !ipAddress.trim())}
          className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {submitting ? t('chat.bans.banning') : t('chat.bans.ban')}
        </button>
      </form>

      <div className="max-h-[400px] overflow-y-auto">
        {bans.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs">
            {t('chat.bans.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {bans.map((b) => (
              <li key={b.id} className="p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {b.email && (
                        <span className="text-foreground font-medium truncate">{b.email}</span>
                      )}
                      {b.ipAddress && (
                        <span className="text-brand font-mono text-xs">{b.ipAddress}</span>
                      )}
                    </div>
                    {b.reason && (
                      <p className="text-xs text-muted-foreground truncate">{b.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true, locale: locale === 'en' ? enUS : es })}
                    </p>
                  </div>
                  <div>
                    {confirmId === b.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRemove(b.id)}
                          className="text-xs px-1.5 py-0.5 rounded bg-destructive text-white hover:bg-destructive/90"
                        >
                          {t('chat.bans.remove')}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs px-1.5 py-0.5 rounded bg-secondary text-foreground hover:bg-secondary"
                        >
                          {t('chat.bans.no')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(b.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={t('chat.bans.removeTitle')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
