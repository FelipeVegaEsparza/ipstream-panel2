import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'
import { cookies } from 'next/headers'
import { DASHBOARD_LOCALE_COOKIE, normalizeDashboardLocale } from '@/lib/dashboard-i18n'

// getServerSession() lee cookies (next-auth), lo que impide que Next.js
// genere las páginas estáticamente. Sin este flag, el build tira error
// "cannot be statically generated".
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  const locale = normalizeDashboardLocale(cookies().get(DASHBOARD_LOCALE_COOKIE)?.value)

  if (!session) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard') // Redirigir a dashboard cliente si no es admin
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-background">
        <AdminLayoutClient locale={locale} user={session.user}>
          {children}
        </AdminLayoutClient>
      </div>
    </SessionProvider>
  )
}