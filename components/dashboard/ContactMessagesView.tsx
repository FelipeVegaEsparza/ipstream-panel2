'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { User as UserIcon, Trash2, ChevronDown, Mail, Phone, Globe } from 'lucide-react'
import { showToast } from '@/components/ui/toast'

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

const FILTER_LABELS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'new', label: 'Nuevos' },
  { key: 'read', label: 'Leídos' },
  { key: 'resolved', label: 'Resueltos' },
]

function statusBadgeClasses(status: Status): string {
  switch (status) {
    case 'new':
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
    case 'read':
      return 'bg-gray-500/15 text-gray-300 border-gray-500/30'
    case 'resolved':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  }
}

function statusLabel(status: Status): string {
  switch (status) {
    case 'new':
      return 'Nuevo'
    case 'read':
      return 'Leído'
    case 'resolved':
      return 'Resuelto'
  }
}

export function ContactMessagesView() {
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
      if (!res.ok) throw new Error('Error al cargar los mensajes')
      const data: ListResponse = await res.json()
      setMessages(data.messages)
      setPagination(data.pagination)
    } catch {
      setError('No se pudieron cargar los mensajes. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

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
      if (!res.ok) throw new Error('Error al actualizar el estado')
      showToast({ type: 'success', title: 'Estado actualizado' })
      await load()
    } catch {
      showToast({ type: 'error', title: 'Error al actualizar el estado' })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/contact-messages/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar el mensaje')
      showToast({ type: 'success', title: 'Mensaje eliminado' })
      setConfirmId(null)
      if (messages.length === 1 && page > 1) setPage(page - 1)
      else await load()
    } catch {
      showToast({ type: 'error', title: 'Error al eliminar el mensaje' })
      setConfirmId(null)
    } finally {
      setBusyId(null)
    }
  }

  const startPage = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endPage = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl">
      <div className="p-4 border-b border-gray-700 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
          {FILTER_LABELS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => changeFilter(opt.key)}
              className={`px-3 py-1 text-xs rounded ${
                filter === opt.key ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          {pagination.total} mensaje{pagination.total === 1 ? '' : 's'}
        </span>
        <div className="flex-1" />
        {pagination.pages > 1 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {pagination.page} de {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages || loading}
              className="px-2.5 py-1 rounded bg-gray-900 border border-gray-700 hover:bg-gray-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 border-b border-gray-700 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="p-10 text-center text-gray-500 text-sm">
          No hay mensajes de contacto
          {filter !== 'all' ? ' con este estado' : ''}.
        </div>
      ) : (
        <div className="max-h-[700px] overflow-y-auto">
          <ul className="divide-y divide-gray-700/50">
            {messages.map((m) => {
              const created = new Date(m.createdAt)
              const isExpanded = expandedId === m.id
              return (
                <li key={m.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-700 text-gray-300 mt-0.5">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold text-sm ${m.status === 'new' ? 'text-cyan-300' : 'text-white'}`}>
                          {m.name}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${statusBadgeClasses(m.status)}`}
                        >
                          {statusLabel(m.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(created, { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap break-words line-clamp-3">
                        {m.message}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 rounded-lg bg-gray-900/60 border border-gray-700 p-3">
                          <div className="flex items-center gap-2 text-sm text-gray-300 flex-wrap">
                            <Mail className="h-4 w-4 text-cyan-400" />
                            <a href={`mailto:${m.email}`} className="hover:text-cyan-300 underline-offset-2 hover:underline">
                              {m.email}
                            </a>
                            <Phone className="h-4 w-4 text-cyan-400 ml-3" />
                            <a href={`tel:${m.phone}`} className="hover:text-cyan-300 underline-offset-2 hover:underline">
                              {m.phone}
                            </a>
                            {m.ip && (
                              <>
                                <Globe className="h-4 w-4 text-cyan-400 ml-3" />
                                <span className="text-gray-400">{m.ip}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
                            <span>Marcar como:</span>
                            {STATUSES.filter((s) => s !== m.status).map((s) => (
                              <button
                                key={s}
                                onClick={() => changeStatus(m.id, s)}
                                disabled={busyId === m.id}
                                className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-cyan-600 hover:text-white disabled:opacity-50"
                              >
                                {statusLabel(s)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-cyan-300 hover:bg-cyan-500/10"
                        title={isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
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
                            {busyId === m.id ? 'Borrando…' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            disabled={busyId === m.id}
                            className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(m.id)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Eliminar mensaje"
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
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between items-center">
          <span>
            Mostrando {startPage}–{endPage} de {pagination.total}
          </span>
        </div>
      )}
    </div>
  )
}
