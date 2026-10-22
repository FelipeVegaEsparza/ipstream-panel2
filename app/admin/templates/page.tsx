import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TemplatesManager } from '@/components/admin/TemplatesManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function TemplatesPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { clients: true }
      }
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.templates.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.templates.subtitle')}
        </p>
      </div>

      <TemplatesManager templates={templates} />
    </div>
  )
}
