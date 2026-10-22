import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GlobalMenuConfig } from '@/components/admin/GlobalMenuConfig'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function GlobalMenuPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div className="text-red-400 p-6">{t('admin.accessDeniedShort')}</div>
  }

  const config = await prisma.appConfig.findFirst()
  let initialHidden: string[] = []
  if (config?.hiddenMenuItems) {
    try {
      const parsed = JSON.parse(config.hiddenMenuItems)
      if (Array.isArray(parsed)) {
        initialHidden = parsed.filter((k) => typeof k === 'string')
      }
    } catch {
      // JSON inválido: ignorar
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.menu.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('admin.menu.subtitle')}
        </p>
      </div>
      <GlobalMenuConfig initialHidden={initialHidden} />
    </div>
  )
}
