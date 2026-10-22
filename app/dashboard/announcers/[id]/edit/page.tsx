import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { AnnouncerForm } from '@/components/dashboard/AnnouncerForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditAnnouncerPageProps {
  params: { id: string }
}

export default async function EditAnnouncerPage({ params }: EditAnnouncerPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  if (!session?.user.clientId) return <div>{t('news.noClient')}</div>

  const announcer = await prisma.announcer.findFirst({
    where: { id: params.id, clientId: session.user.clientId },
  })

  if (!announcer) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('announcers.editPage.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('announcers.editPage.subtitle')}</p>
      </div>
      <div className="card max-w-2xl">
        <AnnouncerForm initialData={announcer} />
      </div>
    </div>
  )
}
