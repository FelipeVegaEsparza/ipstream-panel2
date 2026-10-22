import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { GcBarManager } from '@/components/dashboard/GcBarManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function GcBarPage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'gc-bar')
      if (!allowed) redirect('/dashboard')
    }
  }

  const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
  const effectiveClient = await getEffectiveClient()
  if (!effectiveClient) {
    return <div>{t('gcbar.noClient')}</div>
  }

  const messages = await prisma.gcBarMessage.findMany({
    where: { clientId: effectiveClient.clientId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('gcbar.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('gcbar.subtitle')}
        </p>
      </div>
      <GcBarManager messages={messages} />
    </div>
  )
}
