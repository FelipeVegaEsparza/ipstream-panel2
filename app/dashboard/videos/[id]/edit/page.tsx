import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { VideoForm } from '@/components/dashboard/VideoForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditVideoPageProps {
  params: {
    id: string
  }
}

export default async function EditVideoPage({ params }: EditVideoPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)
  
  if (!session?.user.clientId) {
    return <div>{t('videos.noClient')}</div>
  }

  const video = await prisma.rankingVideo.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    }
  })

  if (!video) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
    <h1 className="text-2xl font-bold text-foreground">
          {t('videos.edit')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('videos.editSubtitle', { position: video.order })}
        </p>
      </div>

      <div className="card max-w-2xl">
        <VideoForm initialData={video} />
      </div>
    </div>
  )
}