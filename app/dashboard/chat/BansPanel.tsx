'use client'

import { useState } from 'react'
import { ShieldOff, Plus, Ban as BanIcon, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ChatBan } from './ChatView'

interface BansPanelProps {
  bans: ChatBan[]
  onAdd: (data: { email?: string; ipAddress?: string; reason?: string }) => Promise<ChatBan | null>
  onRemove: (id: string) => Promise<boolean>
  onError: (msg: string | null) => void
}

export function BansPanel({ bans, onAdd, onRemove, onError }: BansPanelProps) {
  const [email, setEmail] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!email.trim() && !ipAddress.trim()) {
      onError('Ingresá al menos un email o una IP')
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
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <BanIcon className="h-4 w-4 text-red-400" />
          Bans
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Los usuarios baneados no pueden enviar mensajes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-700 space-y-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            maxLength={120}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">IP (opcional)</label>
          <input
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            placeholder="192.168.1.1"
            maxLength={45}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none font-mono"
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Motivo (opcional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Spam, insultos, etc."
            maxLength={200}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          disabled={submitting || (!email.trim() && !ipAddress.trim())}
          className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {submitting ? 'Baneando…' : 'Banear'}
        </button>
      </form>

      <div className="max-h-[400px] overflow-y-auto">
        {bans.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-xs">
            No hay bans activos.
          </div>
        ) : (
          <ul className="divide-y divide-gray-700/50">
            {bans.map((b) => (
              <li key={b.id} className="p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {b.email && (
                        <span className="text-white font-medium truncate">{b.email}</span>
                      )}
                      {b.ipAddress && (
                        <span className="text-cyan-300 font-mono text-xs">{b.ipAddress}</span>
                      )}
                    </div>
                    {b.reason && (
                      <p className="text-xs text-gray-400 truncate">{b.reason}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <div>
                    {confirmId === b.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRemove(b.id)}
                          className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Quitar
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(b.id)}
                        className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Quitar ban"
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
