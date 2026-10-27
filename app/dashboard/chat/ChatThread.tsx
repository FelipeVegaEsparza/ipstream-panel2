'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MessagesSquare, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import type { ChatMessage } from './ChatView'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface ChatThreadProps {
  messages: ChatMessage[]
  onDelete: (id: string) => Promise<boolean>
}

export function ChatThread({ messages, onDelete }: ChatThreadProps) {
  const { t, locale } = useDashboardI18n()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'listener' | 'staff'>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const dateLocale = locale === 'en' ? enUS : es

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return messages
      .filter((m) => filter === 'all' || m.authorType === filter)
      .filter((m) => {
        if (!q) return true
        return (
          m.name.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [messages, search, filter])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [filtered])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const handleConfirm = async (id: string) => {
    setDeleting(true)
    await onDelete(id)
    setDeleting(false)
    setConfirmId(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/40 p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            aria-label={t('chat.searchPlaceholder')}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {[
            { key: 'all', label: t('chat.filter.all') },
            { key: 'listener', label: t('chat.filter.listener') },
            { key: 'staff', label: t('chat.filter.staff') },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key as 'all' | 'listener' | 'staff')}
              aria-pressed={filter === opt.key}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === opt.key
                  ? 'bg-brand text-white'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {t('chat.count', { count: filtered.length })}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto bg-background/20 px-3 py-4 sm:px-4"
      >
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <MessagesSquare className="h-8 w-8 opacity-50" />
            <p>{t('chat.empty')}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((message, index) => {
              const isStaff = message.authorType === 'staff'
              const created = new Date(message.createdAt)
              const previous = filtered[index - 1]
              const showDate =
                !previous ||
                !isSameDay(new Date(previous.createdAt), created)
              const initial = message.name.trim().charAt(0).toUpperCase() || '?'

              return (
                <li key={message.id}>
                  {showDate && (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {format(created, 'PPP', { locale: dateLocale })}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  <div
                    className={`flex items-end gap-2 ${
                      isStaff ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isStaff && (
                      <div
                        className="mb-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                        aria-hidden="true"
                      >
                        {initial}
                      </div>
                    )}

                    <div className="max-w-[85%] sm:max-w-[75%]">
                      <div
                        className={`rounded-2xl border px-3.5 py-2.5 ${
                          isStaff
                            ? 'rounded-br-md border-brand/30 bg-brand/15'
                            : 'rounded-bl-md border-border bg-card'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={`text-xs font-semibold ${
                              isStaff ? 'text-brand' : 'text-foreground'
                            }`}
                          >
                            {message.name}
                          </span>
                          {isStaff && (
                            <span className="rounded border border-brand/30 bg-brand/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                              {t('chat.staffBadge')}
                            </span>
                          )}
                          <time
                            className="text-[11px] text-muted-foreground"
                            dateTime={message.createdAt}
                            title={formatDistanceToNow(created, {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          >
                            {format(created, 'HH:mm')}
                          </time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                          {message.body}
                        </p>
                      </div>

                      <div
                        className={`mt-1 flex flex-wrap items-center gap-2 px-1 ${
                          isStaff ? 'justify-end' : ''
                        }`}
                      >
                        {!isStaff && message.email && (
                          <span
                            className="max-w-[180px] truncate text-[11px] text-muted-foreground"
                            title={message.email}
                          >
                            {message.email}
                          </span>
                        )}
                        {!isStaff && message.ipAddress && (
                          <span
                            className="font-mono text-[11px] text-muted-foreground"
                            title="IP"
                          >
                            {message.ipAddress}
                          </span>
                        )}

                        {confirmId === message.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleConfirm(message.id)}
                              disabled={deleting}
                              className="rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
                            >
                              {deleting ? t('chat.deleting') : t('chat.confirm')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              disabled={deleting}
                              className="rounded-md bg-secondary px-2 py-1 text-[11px] text-secondary-foreground transition-colors hover:bg-secondary/80"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmId(message.id)}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title={t('chat.deleteMessage')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('chat.deleteMessage')}
                          </button>
                        )}
                      </div>
                    </div>

                    {isStaff && (
                      <div
                        className="mb-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white"
                        aria-hidden="true"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
