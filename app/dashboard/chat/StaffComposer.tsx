'use client'

import { useState } from 'react'
import { Send, Megaphone } from 'lucide-react'
import type { ChatMessage } from './ChatView'

interface StaffComposerProps {
  staffName: string
  onSent: (message: ChatMessage) => void
  onError: (msg: string | null) => void
}

export function StaffComposer({ staffName, onSent, onError }: StaffComposerProps) {
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
        onError(d.error || 'No se pudo enviar')
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
      onError(err instanceof Error ? err.message : 'Error al enviar')
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
      className="bg-gray-800/40 border border-cyan-700/40 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="h-4 w-4 text-cyan-400" />
        <span className="text-xs uppercase tracking-wide text-cyan-300 font-semibold">
          Mensaje de Staff
        </span>
        <span className="text-xs text-gray-500">se mostrará como: {staffName}</span>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí un mensaje para los oyentes…"
          rows={2}
          maxLength={500}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:border-cyan-500 focus:outline-none"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-500">Enter para enviar · Shift+Enter para nueva línea</p>
        <p className="text-xs text-gray-500">{body.length}/500</p>
      </div>
    </form>
  )
}
