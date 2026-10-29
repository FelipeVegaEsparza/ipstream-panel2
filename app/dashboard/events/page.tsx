import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { EventsList } from '@/components/dashboard/EventsList'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

export default async function EventsPage() {
  const t = dashboardT(getDashboardLocale())
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'events')
      if (!allowed) redirect('/dashboard')
    }
  }

  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>{t('news.noClient')}</div>

  const events = await prisma.event.findMany({
    where: { clientId: session.user.clientId },
    orderBy: [{ date: 'desc' }, { time: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
     <h1 className="text-2xl font-bold text-foreground">{t('events.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('events.subtitle')}</p>
        </div>
        <Link href="/dashboard/events/new" className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" /> {t('events.new')}
        </Link>
      </div>
      <EventsList events={events} />
    </div>
  )
}
