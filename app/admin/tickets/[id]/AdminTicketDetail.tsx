'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, AlertCircle, User, Mail, Phone, CreditCard, LifeBuoy } from 'lucide-react'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketStatus, type TicketPriority } from '@/lib/ticket-status'
import { MessageBubble, type SupportMessage } from '@/components/support/MessageBubble'
import { AttachmentUploader } from '@/components/support/AttachmentUploader'
import type { SupportAttachment } from '@/components/support/AttachmentCard'

export interface AdminTicketDetailData {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  client: {
    id: string
    name: string
    phone: string | null
    user: { email: string; name: string | null }
    plan: { name: string } | null
  }
  messages: (SupportMessage & { attachments: SupportAttachment[] })[]
  attachments: SupportAttachment[]
}

interface Props {
  ticket: AdminTicketDetailData
}

export function AdminTicketDetail({ ticket: initial }: Props) {
  const router = useRouter()
  const [ticket, setTicket] = useState(initial)
  const [body, setBody] = useState('')
  const [pending, setPending] = useState<SupportAttachment[]>(initial.attachments)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const statusConf = TICKET_STATUS[ticket.status as TicketStatus]
  const priorityConf = TICKET_PRIORITY[ticket.priority as TicketPriority]
  const isClosed = ticket.status === 'closed'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket.messages.length])

  const handleSend = async () => {
    if (body.trim().length === 0) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/messages`, {
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
        status: prev.status === 'open' ? 'in_progress' : prev.status,
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

  const updateStatus = async (newStatus: 'open' | 'in_progress' | 'closed') => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al actualizar')
      }
      const data = await res.json()
      setTicket((prev) => ({ ...prev, status: data.ticket.status, closedAt: data.ticket.closedAt?.toString() ?? null }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/tickets"
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
        <select
          value={ticket.status}
          onChange={(e) => updateStatus(e.target.value as 'open' | 'in_progress' | 'closed')}
          disabled={updatingStatus}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          <option value="open">Abierto</option>
          <option value="in_progress">En progreso</option>
          <option value="closed">Cerrado</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
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
                <p>Este ticket está cerrado. Para responder, reabriéndalo desde el selector de estado.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-700 bg-gray-900/40 space-y-3">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe tu respuesta al cliente..."
                rows={3}
                maxLength={5000}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
              />

              <AttachmentUploader
                ticketId={ticket.id}
                endpoint="/api/admin/tickets"
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
                  {sending ? 'Enviando...' : 'Enviar respuesta'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3 h-fit">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
            Cliente
          </h3>
          <div className="flex items-center gap-2 text-white font-medium">
            <User className="h-4 w-4 text-gray-400" />
            <Link
              href={`/admin/users/${ticket.client.id}`}
              className="hover:text-cyan-300 transition-colors truncate"
            >
              {ticket.client.name}
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <a
              href={`mailto:${ticket.client.user.email}`}
              className="hover:text-cyan-300 transition-colors truncate"
            >
              {ticket.client.user.email}
            </a>
          </div>
          {ticket.client.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <a
                href={`https://wa.me/${ticket.client.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 transition-colors"
              >
                {ticket.client.phone}
              </a>
            </div>
          )}
          {ticket.client.plan && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <CreditCard className="h-4 w-4 flex-shrink-0" />
              <span>Plan: {ticket.client.plan.name}</span>
            </div>
          )}
          <Link
            href={`/admin/users/${ticket.client.id}`}
            className="block text-center mt-2 px-3 py-2 rounded-lg bg-gray-700 text-sm text-white hover:bg-gray-600 transition-colors"
          >
            Ver perfil completo
          </Link>
        </div>
      </div>
    </div>
  )
}
