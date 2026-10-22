import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AdminTicketDetail } from './AdminTicketDetail'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminTicketDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">{t('admin.accessDeniedShort')}</div>
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: params.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          user: { select: { email: true, name: true } },
          plan: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { attachments: { orderBy: { createdAt: 'asc' } } },
      },
      attachments: {
        where: { messageId: null },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) notFound()

  return (
    <AdminTicketDetail
      ticket={{
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
        client: {
          id: ticket.client.id,
          name: ticket.client.name,
          phone: ticket.client.phone,
          user: { email: ticket.client.user.email, name: ticket.client.user.name },
          plan: ticket.client.plan,
        },
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
