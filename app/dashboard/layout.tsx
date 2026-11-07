import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Archivo, Martian_Mono } from 'next/font/google'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { DashboardLayoutClient } from '@/components/dashboard/DashboardLayoutClient'
import { ModalProvider } from '@/components/ui/modal'
import { getEffectiveClient } from '@/lib/getEffectiveClient'
import { cookies } from 'next/headers'
import { DASHBOARD_LOCALE_COOKIE, normalizeDashboardLocale } from '@/lib/dashboard-i18n'
import { resolveClientSiteUrl } from '@/lib/client-domains'
import { getDisabledMenuItems, getGloballyHiddenMenuItems } from '@/lib/menu-permissions'

// getServerSession() lee cookies (next-auth), lo que impide que Next.js
// genere las páginas estáticamente. Sin este flag, el build tira error
// "cannot be statically generated".
export const dynamic = 'force-dynamic'

// Tipografía del dashboard: Archivo para UI y Martian Mono para métricas.
// Se aplican solo al wrapper del panel para no tocar el sitio público.
const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const martian = Martian_Mono({ subsets: ['latin'], variable: '--font-martian', display: 'swap' })

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const locale = normalizeDashboardLocale(cookies().get(DASHBOARD_LOCALE_COOKIE)?.value)

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

  // URL del sitio web público del cliente (para el botón "Ir a mi sitio Web" en el header).
  // Se deriva del dominio primario del cliente (creado al registrarse o por el admin);
  // si no hay dominio registrado, se usa el `websiteUrl` que cargue el admin.
  let websiteUrl: string | null = null
  if (effectiveClient) {
    const [basicData, domainUrl] = await Promise.all([
      prisma.basicData.findUnique({
        where: { clientId: effectiveClient.clientId },
        select: { websiteUrl: true },
      }),
      resolveClientSiteUrl(effectiveClient.clientId),
    ])
    websiteUrl = domainUrl ?? basicData?.websiteUrl ?? null
  }

  return (
    <SessionProvider session={session}>
      <ModalProvider>
        <div className={`dashboard-shell min-h-screen bg-background ${archivo.variable} ${martian.variable}`}>
          <DashboardLayoutClient
            locale={locale}
            user={session.user}
            disabledItems={disabledItems}
            globalHiddenItems={globalHiddenItems}
            websiteUrl={websiteUrl}
          >
            {children}
          </DashboardLayoutClient>
        </div>
      </ModalProvider>
    </SessionProvider>
  )
}