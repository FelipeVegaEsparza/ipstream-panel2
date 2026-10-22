'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LifeBuoy, Search, Filter, AlertTriangle } from 'lucide-react'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketStatus, type TicketPriority } from '@/lib/ticket-status'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export interface AdminTicketListItem {
  id: string
  subject: string
  status: string
  priority: string
  createdAt: string | Date
  updatedAt: string | Date
  messages: Array<{ body: string; authorType: string; createdAt: string | Date }>
  _count: { messages: number }
  client: { id: string; name: string; user: { email: string } }
}

interface TicketsManagerProps {
  initialTickets: AdminTicketListItem[]
  initialSummary: { open: number; in_progress: number; closed: number; urgent: number }
}

export function TicketsManager({ initialTickets, initialSummary }: TicketsManagerProps) {
  const { t, locale } = useDashboardI18n()
  const router = useRouter()
  const [tickets] = useState(initialTickets)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (
        !t.subject.toLowerCase().includes(s) &&
        !t.client.name.toLowerCase().includes(s) &&
        !t.client.user.email.toLowerCase().includes(s)
      )
        return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('admin.tickets.open')} value={initialSummary.open} color="green" />
        <StatCard label={t('admin.tickets.inProgress')} value={initialSummary.in_progress} color="orange" />
        <StatCard label={t('admin.tickets.closed')} value={initialSummary.closed} color="gray" />
        <StatCard
          label={t('admin.tickets.urgentOpen')}
          value={initialSummary.urgent}
          color="red"
          icon
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-card border border-border rounded-lg p-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.tickets.search')}
            className="bg-transparent text-foreground placeholder-gray-500 outline-none flex-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
          >
            <option value="all">{t('admin.tickets.allStatuses')}</option>
            <option value="open">{t('admin.tickets.open')}</option>
            <option value="in_progress">{t('admin.tickets.inProgress')}</option>
            <option value="closed">{t('admin.tickets.closed')}</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-secondary border border-border rounded px-2 py-1 text-sm text-foreground"
          >
            <option value="all">{t('admin.tickets.allPriorities')}</option>
            <option value="urgent">{t('support.priority.urgent')}</option>
            <option value="high">{t('support.priority.high')}</option>
            <option value="normal">{t('support.priority.normal')}</option>
            <option value="low">{t('support.priority.low')}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card/40 rounded-xl border border-dashed border-border">
          <LifeBuoy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {tickets.length === 0 ? t('admin.tickets.empty') : t('admin.tickets.noMatch')}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-left text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium">{t('admin.tickets.client')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.tickets.subject')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.tickets.status')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.tickets.priority')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.tickets.lastMessage')}</th>
                <th className="px-4 py-3 font-medium">{t('admin.tickets.updated')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((ticket) => {
                const statusConf = TICKET_STATUS[ticket.status as TicketStatus]
                const priorityConf = TICKET_PRIORITY[ticket.priority as TicketPriority]
                const lastMessage = ticket.messages[0]
                const updatedAt =
                  typeof ticket.updatedAt === 'string' ? new Date(ticket.updatedAt) : ticket.updatedAt
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                    className="hover:bg-secondary/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium">{ticket.client.name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.client.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-md truncate">
                      {ticket.subject}
                      {ticket._count.messages > 1 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({ticket._count.messages})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${statusConf.color}`}
                      >
                        {t(`support.status.${ticket.status}` as 'support.status.open' | 'support.status.in_progress' | 'support.status.closed')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${priorityConf.color}`}
                      >
                        {ticket.priority === 'urgent' && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {t(`support.priority.${ticket.priority}` as 'support.priority.low' | 'support.priority.normal' | 'support.priority.high' | 'support.priority.urgent')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {lastMessage ? (
                        <span className="text-xs">
                          <span className="text-muted-foreground">
                            {lastMessage.authorType === 'admin' ? t('admin.tickets.you') : t('admin.tickets.clientAuthor')}:
                          </span>{' '}
                          {lastMessage.body}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(updatedAt, { addSuffix: true, locale: locale === 'en' ? enUS : es })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: 'green' | 'orange' | 'gray' | 'red'
  icon?: boolean
}) {
  const colors = {
    green: 'border-green-500/30 bg-green-500/10 text-green-300',
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    gray: 'border-border/30 bg-secondary/10 text-muted-foreground',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
  }
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        {icon && <AlertTriangle className="h-5 w-5" />}
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  )
}
