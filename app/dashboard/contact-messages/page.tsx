import { redirect } from 'next/navigation'
import { ContactMessagesView } from '@/components/dashboard/ContactMessagesView'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export const dynamic = 'force-dynamic'

export default async function ContactMessagesPage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'contact-messages')
      if (!allowed) redirect('/dashboard')
    }
  }

  return (
    <div className="space-y-6">
      <div>
    <h1 className="text-2xl font-bold text-foreground">{t('contact.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('contact.subtitle')}
        </p>
      </div>
      <ContactMessagesView />
    </div>
  )
}
