'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, AlertCircle, LifeBuoy, BellRing } from 'lucide-react'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketStatus, type TicketPriority } from '@/lib/ticket-status'
import { MessageBubble, type SupportMessage } from '@/components/support/MessageBubble'
import { AttachmentUploader } from '@/components/support/AttachmentUploader'
import type { SupportAttachment } from '@/components/support/AttachmentCard'
import { markTicketRead } from '@/lib/ticket-read-state'

export interface ClientTicketDetailData {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  messages: (SupportMessage & { attachments: SupportAttachment[] })[]
  attachments: SupportAttachment[]
}

interface Props {
  ticket: ClientTicketDetailData
}

export function ClientTicketDetail({ ticket: initial }: Props) {
  const router = useRouter()
  const [ticket, setTicket] = useState(initial)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState<SupportAttachment[]>(initial.attachments)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newReply, setNewReply] = useState<{ body: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const knownCount = useRef(initial.messages.length)

  const statusConf = TICKET_STATUS[ticket.status as TicketStatus]
  const priorityConf = TICKET_PRIORITY[ticket.priority as TicketPriority]
  const isClosed = ticket.status === 'closed'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket.messages.length])

  useEffect(() => {
    markTicketRead(ticket.id)
  }, [ticket.id])

  const poll = useCallback(async () => {
    if (isClosed) return
    try {
      const res = await fetch(`/api/dashboard/support/tickets/${ticket.id}`)
      if (!res.ok) return
      const data = await res.json()
      const msgs: (SupportMessage & { attachments: SupportAttachment[] })[] = data.ticket?.messages || data.messages || []
      console.log('[poll] knownCount:', knownCount.current, 'server msgs:', msgs.length)
      if (msgs.length > knownCount.current) {
        const newOnes = msgs.slice(knownCount.current)
        const hasAdmin = newOnes.some((m) => m.authorType === 'admin')
        console.log('[poll] newOnes:', newOnes.length, 'hasAdmin:', hasAdmin)
        if (hasAdmin) {
          setTicket((prev) => ({ ...prev, messages: msgs as typeof prev.messages, status: data.ticket?.status || prev.status }))
          knownCount.current = msgs.length
          markTicketRead(ticket.id)
          if (!document.hidden) {
            setNewReply({ body: newOnes.find((m) => m.authorType === 'admin')?.body || '' })
            setTimeout(() => setNewReply(null), 8000)
          }
        }
      }
    } catch (err) {
      console.error('[poll] error:', err)
    }
  }, [ticket.id, isClosed])

  useEffect(() => {
    const id = setInterval(poll, 15000)
    poll()
    return () => clearInterval(id)
  }, [poll])

  const handleSend = async () => {
    if (body.trim().length === 0) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          attachmentIds: pending.map((a) => a.id),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al enviar')
      }
      const data = await res.json()
      setTicket((prev) => ({
        ...prev,
        messages: [...prev.messages, { ...data.message, attachments: pending }],
      }))
      setBody('')
      setPending([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/support"
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border ${statusConf.color}`}>
              {statusConf.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border ${priorityConf.color}`}>
              Prioridad: {priorityConf.label}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {ticket.messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {isClosed ? (
          <div className="p-4 border-t border-gray-700 bg-gray-900/40">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-700/30 text-sm text-gray-300">
              <LifeBuoy className="h-4 w-4 mt-0.5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-white">Este ticket está cerrado</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Si necesitas ayuda con un tema relacionado, abre uno nuevo.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-gray-700 bg-gray-900/40 space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe tu respuesta..."
              rows={3}
              maxLength={5000}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
            />

            <AttachmentUploader
              ticketId={ticket.id}
              endpoint="/api/dashboard/support/tickets"
              pending={pending}
              onChange={setPending}
            />

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" />
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || body.trim().length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        )}
      </div>

      {newReply && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slide-up">
          <button
            onClick={() => {
              setNewReply(null)
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="w-full flex items-start gap-3 p-4 rounded-xl bg-gray-800 border border-cyan-500/50 shadow-lg shadow-cyan-500/10 text-left hover:bg-gray-700 transition-colors"
          >
            <BellRing className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Nueva respuesta</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{newReply.body}</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
