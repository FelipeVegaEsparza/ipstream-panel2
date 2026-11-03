import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { SpecialsSettings } from '@/components/dashboard/streaming/specials/SpecialsSettings'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems } from '@/lib/menu-permissions'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function SpecialsPage() {
  const t = dashboardT(getDashboardLocale())
  const client = await getEffectiveClient()
  if (!client) {
    return <div className="p-6 text-sm text-muted-foreground">{t('streaming.specials.pageUnauthorized')}</div>
  }

  const disabled = await getDisabledMenuItems(client.clientId)
  if (disabled.has('streaming-especiales')) {
    return (
      <div className="rounded-container border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">{t('streaming.specials.pageDisabledTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('streaming.specials.pageDisabledText')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={t('streaming.specials.title')} description={t('streaming.specials.subtitle')} />
      <SpecialsSettings />
    </div>
  )
}
