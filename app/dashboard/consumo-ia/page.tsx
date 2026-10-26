import { redirect } from 'next/navigation'
import { AiUsageView } from '@/components/dashboard/AiUsageView'
import { getClientAiUsage } from '@/lib/ai-usage'
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

  const data = await getClientAiUsage(effectiveClient.clientId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('aiUsage.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('aiUsage.subtitle')}</p>
      </div>
      <AiUsageView data={data} />
    </div>
  )
}
