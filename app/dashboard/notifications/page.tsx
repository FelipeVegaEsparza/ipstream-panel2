import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PushNotificationsManager } from '@/components/dashboard/PushNotificationsManager'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function NotificationsPage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'notifications')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Verificar si el cliente tiene OneSignal configurado
  const client = await prisma.client.findUnique({
    where: { userId: session.user.id },
    select: {
      oneSignalAppId: true,
      oneSignalApiKey: true
    }
  })

  const hasOneSignal = !!(client?.oneSignalAppId && client?.oneSignalApiKey)

  if (!hasOneSignal) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('push.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('push.subtitle')}
          </p>
        </div>

        <div className="card">
          <div className="text-center py-12">
            <svg className="w-20 h-20 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t('push.notConfigured')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('push.notConfiguredHint')}
            </p>
            <div className="bg-brand/10 border border-brand/30 rounded-lg p-6 max-w-2xl mx-auto text-left">
              <h4 className="text-brand font-medium mb-3">{t('push.whatToDo')}</h4>
              <ol className="text-muted-foreground space-y-2 list-decimal list-inside">
                <li>{t('push.step1')} <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand underline">OneSignal.com</a></li>
                <li>{t('push.step2')}</li>
                <li>{t('push.step3')}</li>
                <li>{t('push.step4')}</li>
                <li>{t('push.step5')}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <PushNotificationsManager />
}
