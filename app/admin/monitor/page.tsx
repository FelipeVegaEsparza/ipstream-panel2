import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { MonitorClient } from '@/components/admin/MonitorClient'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function MonitorPage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  return <MonitorClient />
}
