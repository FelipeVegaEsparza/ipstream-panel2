import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { notFound } from 'next/navigation'
import { ClientTicketDetail } from './ClientTicketDetail'

export const dynamic = 'force-dynamic'

export default async function ClientTicketPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const effective = await getEffectiveClient()
  if (!effective) return null

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: params.id, clientId: effective.clientId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          attachments: { orderBy: { createdAt: 'asc' } },
        },
      },
      attachments: {
        where: { messageId: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) notFound()

  return (
    <ClientTicketDetail
      ticket={{
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
        messages: ticket.messages.map((m) => ({
          id: m.id,
          body: m.body,
          authorType: m.authorType,
          authorName: m.authorName,
          authorId: m.authorId,
          createdAt: m.createdAt.toISOString(),
          attachments: m.attachments,
        })),
        attachments: ticket.attachments,
      }}
    />
  )
}
