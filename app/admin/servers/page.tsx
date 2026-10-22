import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { StreamingServersManager } from '@/components/admin/StreamingServersManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function ServersPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin.servers.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.servers.subtitle')}
        </p>
      </div>
      <StreamingServersManager />
    </div>
  )
}
