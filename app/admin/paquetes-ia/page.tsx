import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AiCreditPacksAdminView } from '@/components/admin/AiCreditPacksAdminView'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminAiCreditPacksPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  const [packs, requests, clients, grants] = await Promise.all([
    prisma.aiCreditPack.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.aiCreditRequest.findMany({
      where: { status: 'pending' },
      include: {
        client: { select: { id: true, name: true, user: { select: { email: true } } } },
        pack: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.client.findMany({
      select: { id: true, name: true, user: { select: { email: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.aiCreditGrant.findMany({
      include: {
        client: { select: { name: true } },
        pack: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('adminAiPacks.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('adminAiPacks.subtitle')}</p>
      </div>
      <AiCreditPacksAdminView
        packs={packs}
        requests={requests.map((request) => ({
          id: request.id,
          clientName: request.client.name,
          clientEmail: request.client.user.email,
          packName: request.pack.name,
          creditType: request.creditType,
          amount: request.amount,
          price: request.price,
          currency: request.currency,
          createdAt: request.createdAt.toISOString(),
        }))}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.user.email,
        }))}
        grants={grants.map((grant) => ({
          id: grant.id,
          clientName: grant.client.name,
          packName: grant.pack.name,
          characters: grant.characters,
          musicSeconds: grant.musicSeconds,
          remainingCharacters: grant.remainingCharacters,
          remainingMusicSeconds: grant.remainingMusicSeconds,
          source: grant.source,
          createdAt: grant.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
