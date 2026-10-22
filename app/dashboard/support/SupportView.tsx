'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LifeBuoy, Plus, MessageCircle } from 'lucide-react'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketStatus, type TicketPriority } from '@/lib/ticket-status'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

const STATUS_KEYS: Record<TicketStatus, 'support.status.open' | 'support.status.in_progress' | 'support.status.closed'> = {
  open: 'support.status.open',
  in_progress: 'support.status.in_progress',
  closed: 'support.status.closed',
}

const PRIORITY_KEYS: Record<TicketPriority, 'support.priority.low' | 'support.priority.normal' | 'support.priority.high' | 'support.priority.urgent'> = {
  low: 'support.priority.low',
  normal: 'support.priority.normal',
  high: 'support.priority.high',
  urgent: 'support.priority.urgent',
}

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
  const { t, locale } = useDashboardI18n()
  const router = useRouter()
  const [tickets] = useState(initialTickets)
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-brand" />
            {t('support.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('support.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('support.newTicket')}
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 bg-card/40 rounded-xl border border-dashed border-border">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-medium text-foreground mb-1">{t('support.empty')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t('support.emptyHint')}
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('support.firstTicket')}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => {
            const statusConf = TICKET_STATUS[ticket.status as TicketStatus]
            const priorityConf = TICKET_PRIORITY[ticket.priority as TicketPriority]
            const lastMessage = ticket.messages[0]
            const updatedAt =
              typeof ticket.updatedAt === 'string' ? new Date(ticket.updatedAt) : ticket.updatedAt
            return (
              <li key={ticket.id}>
                <Link
                  href={`/dashboard/support/${ticket.id}`}
                  className="block bg-card border border-border rounded-xl p-4 hover:border-brand transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-foreground font-semibold flex-1">{ticket.subject}</h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${priorityConf.color}`}
                      >
                        {t(PRIORITY_KEYS[ticket.priority as TicketPriority])}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${statusConf.color}`}
                      >
                        {t(STATUS_KEYS[ticket.status as TicketStatus])}
                      </span>
                    </div>
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      <span className="text-muted-foreground">
                        {lastMessage.authorType === 'admin' ? t('support.staff') : t('support.you')}:{' '}
                      </span>
                      {lastMessage.body}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{ticket._count.messages === 1 ? t('support.message') : t('support.messages', { count: ticket._count.messages })}</span>
                    <span>·</span>
                    <span>
                      {t('support.updated', { time: formatDistanceToNow(updatedAt, { addSuffix: true, locale: locale === 'en' ? enUS : es }) })}
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
  const { t } = useDashboardI18n()
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
      setError(t('support.form.minError'))
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
        throw new Error(data.error || t('support.form.createError'))
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
            throw new Error(t('support.form.uploadFileError', { name: file.name, error: errData.error || t('support.form.unknownError') }))
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
      setError(err instanceof Error ? err.message : t('support.form.createError'))
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
        className="bg-card rounded-2xl border border-border max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-foreground">{t('support.form.new')}</h2>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('support.form.subject')}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('support.form.subjectPlaceholder')}
              maxLength={200}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
              required
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('support.form.priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
            >
              <option value="low">{t('support.priority.low')}</option>
              <option value="normal">{t('support.priority.normal')}</option>
              <option value="high">{t('support.priority.high')}</option>
              <option value="urgent">{t('support.priority.urgent')}</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('support.form.message')}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('support.form.messagePlaceholder')}
              rows={5}
              maxLength={5000}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground resize-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">{body.length}/5000</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">{t('support.form.attachments')}</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-brand cursor-pointer transition-colors text-sm">
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
                ? t('support.form.selectFiles')
                : t('support.form.selectedFiles', { count: files.length })}
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      ({(f.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-300 ml-auto flex-shrink-0"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      {t('support.form.remove')}
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
              className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary"
            >
              {t('support.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-brand text-white font-medium hover:bg-brand disabled:opacity-50"
            >
              {submitting ? (uploadProgress ? t('support.form.uploading') : t('support.form.creating')) : t('support.form.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
