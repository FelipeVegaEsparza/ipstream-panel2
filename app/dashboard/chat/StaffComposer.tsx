'use client'

import { useState } from 'react'
import { Send, Megaphone } from 'lucide-react'
import type { ChatMessage } from './ChatView'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface StaffComposerProps {
  staffName: string
  onSent: (message: ChatMessage) => void
  onError: (msg: string | null) => void
}

export function StaffComposer({ staffName, onSent, onError }: StaffComposerProps) {
  const { t } = useDashboardI18n()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    onError(null)
    try {
      const res = await fetch('/api/dashboard/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        onError(d.error || t('chat.composer.couldNotSend'))
        return
      }
      const data = await res.json()
      onSent({
        ...data.message,
        createdAt: typeof data.message.createdAt === 'string'
          ? data.message.createdAt
          : new Date(data.message.createdAt).toISOString(),
      })
      setBody('')
    } catch (err) {
      onError(err instanceof Error ? err.message : t('chat.composer.sendError'))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card px-3 py-3 sm:px-4"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Megaphone className="h-4 w-4 text-brand" />
        <span className="text-xs font-semibold uppercase tracking-wide text-brand">
          {t('chat.composer.label')}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('chat.composer.showingAs', { name: staffName })}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.composer.placeholder')}
          aria-label={t('chat.composer.placeholder')}
          rows={2}
          maxLength={500}
     className="min-h-[44px] flex-1 resize-none rounded-panel border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
     className="inline-flex h-11 items-center gap-2 rounded-panel bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? t('chat.composer.sending') : t('chat.composer.send')}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t('chat.composer.hint')}</p>
        <p className="text-xs text-muted-foreground">{body.length}/500</p>
      </div>
    </form>
  )
}
