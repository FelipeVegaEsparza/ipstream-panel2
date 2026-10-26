import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdminAiUsageView } from '@/components/admin/AiUsageAdminView'
import { getAdminAiUsage } from '@/lib/ai-usage'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function AdminAiUsagePage() {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return <div>{t('admin.accessDenied')}</div>
  }

  const data = await getAdminAiUsage()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('aiUsage.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('aiUsage.adminSubtitle')}</p>
      </div>
      <AdminAiUsageView data={data} />
    </div>
  )
}
