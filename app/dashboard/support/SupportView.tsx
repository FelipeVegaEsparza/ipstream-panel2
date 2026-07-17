'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LifeBuoy, Plus, MessageCircle } from 'lucide-react'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketStatus, type TicketPriority } from '@/lib/ticket-status'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export interface SupportTicketListItem {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string | Date
  updatedAt: string | Date
  messages: Array<{ body: string; authorType: string; createdAt: string | Date }>
  _count: { messages: number }
}

interface SupportViewProps {
  initialTickets: SupportTicketListItem[]
}

export function SupportView({ initialTickets }: SupportViewProps) {
  const router = useRouter()
  const [tickets] = useState(initialTickets)
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-cyan-400" />
            Soporte
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Abrí un ticket y te responderemos a la brevedad
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/40 rounded-xl border border-dashed border-gray-700">
          <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-white mb-1">No tienes tickets</h2>
          <p className="text-sm text-gray-400 mb-4">
            Cuando tengas una duda o problema, abre un ticket y te ayudamos.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Abrir mi primer ticket
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => {
            const statusConf = TICKET_STATUS[t.status as TicketStatus]
            const priorityConf = TICKET_PRIORITY[t.priority as TicketPriority]
            const lastMessage = t.messages[0]
            const updatedAt =
              typeof t.updatedAt === 'string' ? new Date(t.updatedAt) : t.updatedAt
            return (
              <li key={t.id}>
                <Link
                  href={`/dashboard/support/${t.id}`}
                  className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-cyan-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-white font-semibold flex-1">{t.subject}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${priorityConf.color}`}
                      >
                        {priorityConf.label}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${statusConf.color}`}
                      >
                        {statusConf.label}
                      </span>
                    </div>
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-gray-400 line-clamp-1">
                      <span className="text-gray-500">
                        {lastMessage.authorType === 'admin' ? 'Soporte' : 'Tú'}:{' '}
                      </span>
                      {lastMessage.body}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{t._count.messages} mensaje{t._count.messages === 1 ? '' : 's'}</span>
                    <span>·</span>
                    <span>
                      Actualizado{' '}
                      {formatDistanceToNow(updatedAt, { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={() => router.refresh()} />}
    </div>
  )
}

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (subject.length < 5 || body.length < 10) {
      setError('Asunto mínimo 5 caracteres, mensaje mínimo 10')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, priority, body, attachmentIds: [] }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Error al crear')
      }
      const data = await res.json()
      const ticketId = data.ticket.id
      const firstMessageId = data.firstMessageId

      const attachmentIds: string[] = []
      if (files.length > 0) {
        setUploadProgress(true)
        for (const file of files) {
          const formData = new FormData()
          formData.append('file', file)
          const uploadRes = await fetch(`/api/dashboard/support/tickets/${ticketId}/attachments`, {
            method: 'POST',
            body: formData,
          })
          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}))
            throw new Error(`Error al subir ${file.name}: ${errData.error || 'Error desconocido'}`)
          }
          const uploadData = await uploadRes.json()
          attachmentIds.push(uploadData.attachment.id)
          setUploadProgress(false)
        }
      }

      if (attachmentIds.length > 0 && firstMessageId) {
        await fetch(`/api/dashboard/support/tickets/${ticketId}/messages/${firstMessageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachmentIds }),
        })
      }

      onCreated()
      window.location.href = `/dashboard/support/${ticketId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear')
    } finally {
      setSubmitting(false)
      setUploadProgress(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl border border-gray-700 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white">Nuevo ticket</h2>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Asunto *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: No puedo subir imágenes"
              maxLength={200}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Prioridad</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Mensaje *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe tu problema o pregunta con el mayor detalle posible"
              rows={5}
              maxLength={5000}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{body.length}/5000</p>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Archivos adjuntos</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:border-cyan-500 cursor-pointer transition-colors text-sm">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setFiles(Array.from(e.target.files))
                }}
              />
              {files.length === 0
                ? 'Seleccionar archivos'
                : `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}`}
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-gray-500 flex-shrink-0">
                      ({(f.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300 ml-auto flex-shrink-0"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 disabled:opacity-50"
            >
              {submitting ? (uploadProgress ? 'Subiendo archivos...' : 'Creando...') : 'Crear ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
