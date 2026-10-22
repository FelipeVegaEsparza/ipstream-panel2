'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { User as UserIcon, Trash2, ChevronDown, Mail, Phone, Globe } from 'lucide-react'
import { showToast } from '@/components/ui/toast'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

const PAGE_SIZE = 20
const STATUSES = ['new', 'read', 'resolved'] as const
type Status = (typeof STATUSES)[number]

interface ContactMessageItem {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: Status
  ip: string | null
  createdAt: string
  updatedAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface ListResponse {
  messages: ContactMessageItem[]
  pagination: Pagination
}

type Filter = 'all' | Status

const FILTER_KEYS: Record<Filter, 'contact.filter.all' | 'contact.filter.new' | 'contact.filter.read' | 'contact.filter.resolved'> = {
  all: 'contact.filter.all',
  new: 'contact.filter.new',
  read: 'contact.filter.read',
  resolved: 'contact.filter.resolved',
}

const FILTERS: Filter[] = ['all', 'new', 'read', 'resolved']

const STATUS_KEYS: Record<Status, 'contact.status.new' | 'contact.status.read' | 'contact.status.resolved'> = {
  new: 'contact.status.new',
  read: 'contact.status.read',
  resolved: 'contact.status.resolved',
}

function statusBadgeClasses(status: Status): string {
  switch (status) {
    case 'new':
      return 'bg-brand/15 text-brand border-brand/30'
    case 'read':
      return 'bg-secondary/15 text-muted-foreground border-border/30'
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  }
}

export function ContactMessagesView() {
  const { t, locale } = useDashboardI18n()
  const [messages, setMessages] = useState<ContactMessageItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  })
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (filter !== 'all') params.set('status', filter)
      const res = await fetch(`/api/dashboard/contact-messages?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(t('contact.loadError'))
      const data: ListResponse = await res.json()
      setMessages(data.messages)
      setPagination(data.pagination)
    } catch {
      setError(t('contact.loadError'))
    } finally {
      setLoading(false)
    }
  }, [page, filter, t])

  useEffect(() => {
    load()
  }, [load])

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setPage(1)
  }

  const changeStatus = async (id: string, status: Status) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/contact-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(t('contact.updateError'))
      showToast({ type: 'success', title: t('contact.updated') })
      await load()
    } catch {
      showToast({ type: 'error', title: t('contact.updateError') })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/contact-messages/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('contact.deleteError'))
      showToast({ type: 'success', title: t('contact.deleted') })
      setConfirmId(null)
      if (messages.length === 1 && page > 1) setPage(page - 1)
      else await load()
    } catch {
      showToast({ type: 'error', title: t('contact.deleteError') })
      setConfirmId(null)
    } finally {
      setBusyId(null)
    }
  }

  const startPage = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endPage = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="bg-card/40 border border-border rounded-xl">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
          {FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => changeFilter(key)}
              className={`px-3 py-1 text-xs rounded ${
                filter === key ? 'bg-brand text-white' : 'text-muted-foreground hover:text-white'
              }`}
            >
              {t(FILTER_KEYS[key])}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {t('contact.count', { count: pagination.total })}
        </span>
        <div className="flex-1" />
        {pagination.pages > 1 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-secondary disabled:opacity-40"
            >
              {t('contact.previous')}
            </button>
            <span>
              {t('contact.page', { page: pagination.page, pages: pagination.pages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages || loading}
              className="px-2.5 py-1 rounded bg-background border border-border hover:bg-secondary disabled:opacity-40"
            >
              {t('contact.next')}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 border-b border-border bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground text-sm">
          {filter === 'all' ? t('contact.empty') : t('contact.emptyFiltered')}
        </div>
      ) : (
        <div className="max-h-[700px] overflow-y-auto">
          <ul className="divide-y divide-border/50">
            {messages.map((m) => {
              const created = new Date(m.createdAt)
              const isExpanded = expandedId === m.id
              return (
                <li key={m.id} className="p-4 hover:bg-card/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-muted-foreground mt-0.5">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold text-sm ${m.status === 'new' ? 'text-brand' : 'text-foreground'}`}>
                          {m.name}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusBadgeClasses(m.status)}`}
                        >
                          {t(STATUS_KEYS[m.status])}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(created, { addSuffix: true, locale: locale === 'en' ? enUS : es })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words line-clamp-3">
                        {m.message}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 rounded-lg bg-background/60 border border-border p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Mail className="h-4 w-4 text-brand" />
                            <a href={`mailto:${m.email}`} className="hover:text-brand underline-offset-2 hover:underline">
                              {m.email}
                            </a>
                            <Phone className="h-4 w-4 text-brand ml-3" />
                            <a href={`tel:${m.phone}`} className="hover:text-brand underline-offset-2 hover:underline">
                              {m.phone}
                            </a>
                            {m.ip && (
                              <>
                                <Globe className="h-4 w-4 text-brand ml-3" />
                                <span className="text-muted-foreground">{m.ip}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <span>{t('contact.markAs')}</span>
                            {STATUSES.filter((s) => s !== m.status).map((s) => (
                              <button
                                key={s}
                                onClick={() => changeStatus(m.id, s)}
                                disabled={busyId === m.id}
                                className="px-2 py-1 rounded bg-card border border-border text-muted-foreground hover:bg-brand hover:text-white disabled:opacity-50"
                              >
                                {t(STATUS_KEYS[s])}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="p-1.5 rounded text-muted-foreground hover:text-brand hover:bg-brand/10"
                        title={isExpanded ? t('contact.hideDetails') : t('contact.showDetails')}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {confirmId === m.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={busyId === m.id}
                            className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {busyId === m.id ? t('contact.deleting') : t('contact.confirm')}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            disabled={busyId === m.id}
                            className="text-xs px-2 py-1 rounded bg-secondary text-foreground hover:bg-secondary"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(m.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          title={t('contact.deleteMessage')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {pagination.total > 0 && (
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
          <span>
            {t('contact.showing', { start: startPage, end: endPage, total: pagination.total })}
          </span>
        </div>
      )}
    </div>
  )
}
