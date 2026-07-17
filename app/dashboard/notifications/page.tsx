import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PushNotificationsManager } from '@/components/dashboard/PushNotificationsManager'

export default async function NotificationsPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">
            Notificaciones Push
          </h1>
          <p className="text-gray-400">
            Envía notificaciones a los usuarios de tu PWA
          </p>
        </div>

        <div className="card">
          <div className="text-center py-12">
            <svg className="w-20 h-20 text-yellow-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">
              OneSignal no configurado
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Para usar notificaciones push, el administrador debe configurar tus credenciales de OneSignal.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 max-w-2xl mx-auto text-left">
              <h4 className="text-blue-300 font-medium mb-3">¿Qué necesitas hacer?</h4>
              <ol className="text-gray-300 space-y-2 list-decimal list-inside">
                <li>Crea una cuenta gratuita en <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">OneSignal.com</a></li>
                <li>Crea una nueva aplicación (App) en OneSignal</li>
                <li>Ve a Settings → Keys & IDs</li>
                <li>Copia el "App ID" y "REST API Key"</li>
                <li>Contacta al administrador para que configure estas credenciales en tu cuenta</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <PushNotificationsManager />
}
