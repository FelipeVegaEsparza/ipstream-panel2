import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'
import { redirect } from 'next/navigation'
import { AiUsageView } from '@/components/dashboard/AiUsageView'
import { getClientAiUsage } from '@/lib/ai-usage'
import { getActiveAiCreditPacks, getClientAiCreditRequests } from '@/lib/ai-credits'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function AiUsagePage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'ai-usage')
      if (!allowed) redirect('/dashboard')
    }
  }

  const effectiveClient = await getEffectiveClient()
  if (!effectiveClient) {
    return <div>{t('aiUsage.noClient')}</div>
  }

  const [data, creditPacks, creditRequests] = await Promise.all([
    getClientAiUsage(effectiveClient.clientId),
    getActiveAiCreditPacks(),
    getClientAiCreditRequests(effectiveClient.clientId),
  ])

  return (
    <div className="space-y-6">
      <DashboardPageHeader title={t('aiUsage.title')} description={t('aiUsage.subtitle')} />
      <AiUsageView data={data} creditPacks={creditPacks} creditRequests={creditRequests} />
    </div>
  )
}
