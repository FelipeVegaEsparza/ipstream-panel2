import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EventForm } from '@/components/dashboard/EventForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditEventPageProps {
  params: { id: string }
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>{t('news.noClient')}</div>

  const event = await prisma.event.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
  })

  if (!event) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('events.edit')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('events.editSubtitle')}</p>
      </div>
      <div className="card max-w-2xl">
        <EventForm initialData={event} />
      </div>
    </div>
  )
}
