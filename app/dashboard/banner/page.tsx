import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BannerManager } from '@/components/dashboard/BannerManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function BannerPage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'banner')
      if (!allowed) redirect('/dashboard')
    }
  }

  const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
  const effectiveClient = await getEffectiveClient()
  if (!effectiveClient) {
    return <div>{t('banner.noClient')}</div>
  }

  const banners = await prisma.banner.findMany({
    where: { clientId: effectiveClient.clientId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('banner.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('banner.subtitle')}</p>
      </div>
      <BannerManager banners={banners} />
    </div>
  )
}
