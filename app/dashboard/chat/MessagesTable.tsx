'use client'

import { useState, useMemo } from 'react'
import { Trash2, Search, ShieldCheck, User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ChatMessage } from './ChatView'

interface MessagesTableProps {
  messages: ChatMessage[]
  onDelete: (id: string) => Promise<boolean>
}

export function MessagesTable({ messages, onDelete }: MessagesTableProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'listener' | 'staff'>('all')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [messages, search, filter])

  const handleConfirm = async (id: string) => {
    setDeleting(true)
    await onDelete(id)
    setDeleting(false)
    setConfirmId(null)
  }

  return (
    <div className="bg-card/40 border border-border rounded-xl">
      <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o mensaje…"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'listener', label: 'Oyentes' },
            { key: 'staff', label: 'Staff' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key as 'all' | 'listener' | 'staff')}
              className={`px-3 py-1 text-xs rounded ${
                filter === opt.key
                  ? 'bg-brand text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} mensaje{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No hay mensajes para mostrar.
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((m) => {
              const isStaff = m.authorType === 'staff'
              const created = new Date(m.createdAt)
              return (
                <li key={m.id} className="p-4 hover:bg-card/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isStaff ? 'bg-brand/20 text-brand' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {isStaff ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold text-sm ${isStaff ? 'text-brand' : 'text-foreground'}`}>
                          {m.name}
                        </span>
                        {isStaff && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
                            Staff
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(created, { addSuffix: true, locale: es })}
                        </span>
                        {m.email && !isStaff && (
                          <span className="text-xs text-muted-foreground truncate" title={m.email}>
                            · {m.email}
                          </span>
                        )}
                        {m.ipAddress && !isStaff && (
                          <span className="text-xs text-muted-foreground" title="IP">
                            · {m.ipAddress}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {m.body}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {confirmId === m.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleConfirm(m.id)}
                            disabled={deleting}
                            className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {deleting ? 'Borrando…' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            disabled={deleting}
                            className="text-xs px-2 py-1 rounded bg-secondary text-foreground hover:bg-secondary"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(m.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          title="Borrar mensaje"
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
        )}
      </div>
    </div>
  )
}
