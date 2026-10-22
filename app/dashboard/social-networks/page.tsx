import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SocialNetworksForm } from '@/components/dashboard/SocialNetworksForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function SocialNetworksPage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'social-networks')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>{t('gcbar.noClient')}</div>
  }

  const socialNetworks = await prisma.socialNetworks.findUnique({
    where: { clientId: session.user.clientId }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('social.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('social.subtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <SocialNetworksForm initialData={socialNetworks} />
      </div>
    </div>
  )
}