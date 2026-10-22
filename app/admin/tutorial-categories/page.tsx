import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CategoriesManager } from './CategoriesManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function TutorialCategoriesPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">{t('admin.accessDeniedShort')}</div>
  }

  const categories = await prisma.tutorialCategory.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { tutorials: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('admin.tutorialCategories.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.tutorialCategories.subtitle')}
        </p>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  )
}
