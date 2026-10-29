import { LocutorIaSettings } from '@/components/dashboard/streaming/locutor-ia/LocutorIaSettings'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems } from '@/lib/menu-permissions'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function LocutorIaPage() {
  const t = dashboardT(getDashboardLocale())
  const client = await getEffectiveClient()
  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">{t('streaming.locutor.pageUnauthorized')}</div>
  }

  const disabled = await getDisabledMenuItems(client.clientId)
  if (disabled.has('streaming-locutor-ia')) {
    return (
   <div className="rounded-container border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">{t('streaming.locutor.pageDisabledTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('streaming.locutor.pageDisabledText')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          {t('streaming.locutor.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t('streaming.locutor.subtitle')}
        </p>
      </div>
      <LocutorIaSettings />
    </div>
  )
}
