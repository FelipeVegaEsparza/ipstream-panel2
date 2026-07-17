import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'
import { DashboardLayoutClient } from '@/components/dashboard/DashboardLayoutClient'
import { ModalProvider } from '@/components/ui/modal'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { getDisabledMenuItems, getGloballyHiddenMenuItems } from '@/lib/menu-permissions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Permitir acceso si es CLIENT o si es ADMIN (para impersonación)
  if (session.user.role !== 'CLIENT' && session.user.role !== 'ADMIN') {
    redirect('/auth/login')
  }

  // Cargar permisos del cliente (o del cliente impersonado si es admin) + items ocultos globalmente
  const [effectiveClient, globalHiddenSet] = await Promise.all([
    getEffectiveClient(),
    getGloballyHiddenMenuItems(),
  ])
  const disabledSet = effectiveClient
    ? await getDisabledMenuItems(effectiveClient.clientId)
    : new Set<string>()
  // Set no es serializable a través del boundary Server→Client, pasamos Array
  const disabledItems = Array.from(disabledSet) as Array<
    import('@/lib/menu-items').MenuItemKey
  >
  const globalHiddenItems = Array.from(globalHiddenSet) as Array<
    import('@/lib/menu-items').MenuItemKey
  >

  return (
    <SessionProvider session={session}>
      <ModalProvider>
        <div className="min-h-screen bg-gray-900">
          <ImpersonationBanner />
          <DashboardLayoutClient
            user={session.user}
            disabledItems={disabledItems}
            globalHiddenItems={globalHiddenItems}
          >
            {children}
          </DashboardLayoutClient>
        </div>
      </ModalProvider>
    </SessionProvider>
  )
}