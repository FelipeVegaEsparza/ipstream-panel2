'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LifeBuoy, Search, Filter, AlertTriangle } from 'lucide-react'
import { TICKET_STATUS, TICKET_PRIORITY, type TicketStatus, type TicketPriority } from '@/lib/ticket-status'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

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
        <StatCard label="Abiertos" value={initialSummary.open} color="green" />
        <StatCard label="En progreso" value={initialSummary.in_progress} color="orange" />
        <StatCard label="Cerrados" value={initialSummary.closed} color="gray" />
        <StatCard
          label="Urgentes (abiertos)"
          value={initialSummary.urgent}
          color="red"
          icon
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-gray-800 border border-gray-700 rounded-lg p-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por asunto, cliente o email..."
            className="bg-transparent text-white placeholder-gray-500 outline-none flex-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="open">Abiertos</option>
            <option value="in_progress">En progreso</option>
            <option value="closed">Cerrados</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
          >
            <option value="all">Todas las prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="normal">Normal</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/40 rounded-xl border border-dashed border-gray-700">
          <LifeBuoy className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {tickets.length === 0 ? 'No hay tickets aún.' : 'No hay tickets que coincidan con los filtros.'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/40 text-left text-gray-400 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Asunto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Último mensaje</th>
                <th className="px-4 py-3 font-medium">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map((t) => {
                const statusConf = TICKET_STATUS[t.status as TicketStatus]
                const priorityConf = TICKET_PRIORITY[t.priority as TicketPriority]
                const lastMessage = t.messages[0]
                const updatedAt =
                  typeof t.updatedAt === 'string' ? new Date(t.updatedAt) : t.updatedAt
                return (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/tickets/${t.id}`)}
                    className="hover:bg-gray-700/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{t.client.name}</p>
                      <p className="text-xs text-gray-400">{t.client.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-white max-w-md truncate">
                      {t.subject}
                      {t._count.messages > 1 && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({t._count.messages})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${statusConf.color}`}
                      >
                        {statusConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${priorityConf.color}`}
                      >
                        {t.priority === 'urgent' && (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {priorityConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {lastMessage ? (
                        <span className="text-xs">
                          <span className="text-gray-500">
                            {lastMessage.authorType === 'admin' ? 'Vos' : 'Cliente'}:
                          </span>{' '}
                          {lastMessage.body}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(updatedAt, { addSuffix: true, locale: es })}
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
    gray: 'border-gray-600/30 bg-gray-500/10 text-gray-300',
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
