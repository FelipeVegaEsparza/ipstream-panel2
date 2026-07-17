import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LifeBuoy } from 'lucide-react'
import { TicketsManager } from './TicketsManager'

export const dynamic = 'force-dynamic'

export default async function AdminTicketsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">Acceso no autorizado</div>
  }

  const [tickets, grouped] = await Promise.all([
    prisma.supportTicket.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        client: { select: { id: true, name: true, user: { select: { email: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, authorType: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.supportTicket.groupBy({
      by: ['status', 'priority'],
      _count: { _all: true },
    }),
  ])

  const summary = { open: 0, in_progress: 0, closed: 0, urgent: 0 }
  for (const row of grouped) {
    if (row.status === 'open') summary.open += row._count._all
    if (row.status === 'in_progress') summary.in_progress += row._count._all
    if (row.status === 'closed') summary.closed += row._count._all
    if (row.priority === 'urgent' && row.status !== 'closed') summary.urgent += row._count._all
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <LifeBuoy className="h-7 w-7 text-cyan-400" />
          Tickets de soporte
        </h1>
        <p className="text-gray-400 mt-1">
          Gestioná los tickets de soporte de todos tus clientes
        </p>
      </div>
      <TicketsManager
        initialTickets={tickets.map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          messages: t.messages.map((m) => ({
            body: m.body,
            authorType: m.authorType,
            createdAt: m.createdAt.toISOString(),
          })),
          _count: { messages: t._count.messages },
          client: {
            id: t.client.id,
            name: t.client.name,
            user: { email: t.client.user.email },
          },
        }))}
        initialSummary={summary}
      />
    </div>
  )
}
