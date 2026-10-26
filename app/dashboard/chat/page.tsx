import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { ChatView } from './ChatView'
import { getChatStats, isChatEnabledForClient } from '@/lib/chat-helpers'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const effective = await getEffectiveClient()
  if (!effective) return null
  if (!(await isChatEnabledForClient(effective.clientId))) redirect('/dashboard')

  const [basicData, initialMessages, bans, stats] = await Promise.all([
    prisma.basicData.findUnique({
      where: { clientId: effective.clientId },
      select: { projectName: true },
    }),
    prisma.chatMessage.findMany({
      where: { clientId: effective.clientId },
      select: {
        id: true,
        authorType: true,
        name: true,
        body: true,
        email: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.chatBan.findMany({
      where: { clientId: effective.clientId },
      orderBy: { createdAt: 'desc' },
    }),
    getChatStats(effective.clientId),
  ])

  return (
    <ChatView
      staffName={basicData?.projectName || t('chat.stationFallback')}
      initialMessages={initialMessages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))}
      initialBans={bans.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
      }))}
      initialStats={stats}
    />
  )
}
