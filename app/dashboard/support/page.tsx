import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { SupportView } from './SupportView'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const effective = await getEffectiveClient()
  if (!effective) {
    return (
      <div className="text-center py-12 text-gray-400">
        No tienes un cliente asignado.
      </div>
    )
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { clientId: effective.clientId },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true, authorType: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  })

  return (
    <SupportView
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
      }))}
    />
  )
}
