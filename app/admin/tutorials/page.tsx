import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TutorialsManager } from './TutorialsManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function TutorialsAdminPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">{t('admin.accessDeniedShort')}</div>
  }

  const [tutorials, categories] = await Promise.all([
    prisma.tutorial.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.tutorialCategory.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('admin.tutorials.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.tutorials.subtitle')}
        </p>
      </div>
      <TutorialsManager initialTutorials={tutorials} initialCategories={categories} />
    </div>
  )
}
