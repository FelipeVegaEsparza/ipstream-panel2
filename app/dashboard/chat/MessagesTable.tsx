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
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl">
      <div className="p-4 border-b border-gray-700 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o mensaje…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
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
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          {filtered.length} mensaje{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No hay mensajes para mostrar.
          </div>
        ) : (
          <ul className="divide-y divide-gray-700/50">
            {filtered.map((m) => {
              const isStaff = m.authorType === 'staff'
              const created = new Date(m.createdAt)
              return (
                <li key={m.id} className="p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isStaff ? 'bg-cyan-600/20 text-cyan-300' : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {isStaff ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold text-sm ${isStaff ? 'text-cyan-300' : 'text-white'}`}>
                          {m.name}
                        </span>
                        {isStaff && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-cyan-600/20 text-cyan-300 border border-cyan-600/30">
                            Staff
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(created, { addSuffix: true, locale: es })}
                        </span>
                        {m.email && !isStaff && (
                          <span className="text-xs text-gray-600 truncate" title={m.email}>
                            · {m.email}
                          </span>
                        )}
                        {m.ipAddress && !isStaff && (
                          <span className="text-xs text-gray-600" title="IP">
                            · {m.ipAddress}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">
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
                            className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(m.id)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"
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
