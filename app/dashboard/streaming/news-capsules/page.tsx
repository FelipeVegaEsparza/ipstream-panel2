import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { NewsCapsulesSettings } from '@/components/dashboard/streaming/news-capsules/NewsCapsulesSettings'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems } from '@/lib/menu-permissions'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function NewsCapsulesPage() {
  const t = dashboardT(getDashboardLocale())
  const client = await getEffectiveClient()
  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">{t('streaming.newsCapsules.loadError')}</div>
  }

  const disabled = await getDisabledMenuItems(client.clientId)
  if (disabled.has('streaming-news-capsules')) {
    return (
      <div className="rounded-container border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">{t('streaming.newsCapsules.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('streaming.newsCapsules.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={t('streaming.newsCapsules.title')}
        description={t('streaming.newsCapsules.subtitle')}
      />
      <NewsCapsulesSettings />
    </div>
  )
}
