import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { GalleryForm } from '@/components/dashboard/GalleryForm'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface EditGalleryPageProps {
  params: {
    id: string
  }
}

export default async function EditGalleryPage({ params }: EditGalleryPageProps) {
  const t = dashboardT(getDashboardLocale())
  const session = await getServerSession(authOptions)

  if (!session?.user.clientId) {
    return <div>{t('news.noClient')}</div>
  }

  const gallery = await prisma.gallery.findFirst({
    where: {
      id: params.id,
      clientId: session.user.clientId,
    },
    include: {
      images: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!gallery) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
    <h1 className="text-2xl font-bold text-foreground">{t('galleries.form.edit')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('galleries.form.editSubtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <GalleryForm initialData={gallery} />
      </div>
    </div>
  )
}
