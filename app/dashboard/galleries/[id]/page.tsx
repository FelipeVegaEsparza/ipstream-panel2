import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, ArrowLeftIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { getDashboardLocale } from '@/lib/dashboard-locale-server'
import { dashboardT } from '@/lib/dashboard-i18n'

interface GalleryDetailPageProps {
  params: {
    id: string
  }
}

export default async function GalleryDetailPage({ params }: GalleryDetailPageProps) {
  const locale = getDashboardLocale()
  const t = dashboardT(locale)
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/galleries"
            className="p-2 text-muted-foreground hover:text-muted-foreground"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
      <h1 className="text-2xl font-bold text-foreground">
              {t('galleries.detail.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('galleries.detail.subtitle')}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/galleries/${gallery.id}/edit`}
          className="btn-primary flex items-center gap-2"
        >
          <PencilIcon className="h-5 w-5" />
          {t('common.edit')}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="card">
            <article className="space-y-6">
              <header>
        <h1 className="text-3xl font-bold text-foreground mb-4">
                  {gallery.title}
                </h1>

                <div className="flex items-center text-sm text-muted-foreground mb-6">
                  <span>{t('galleries.detail.created', { date: formatDate(gallery.createdAt) })}</span>
                  <span className="mx-2">&bull;</span>
                  <span>{t('galleries.detail.updated', { date: formatDate(gallery.updatedAt) })}</span>
                </div>
              </header>

       <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                {gallery.description}
              </div>

              {/* Image Gallery Grid */}
              {gallery.images.length > 0 ? (
                <div>
         <h2 className="text-xl font-bold text-foreground mb-4">
                    {t('galleries.detail.images', { count: gallery.images.length })}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gallery.images.map((img, index) => (
           <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-line">
                        <Image
                          src={img.imageUrl}
                          alt={t('galleries.detail.imageAlt', { title: gallery.title, index: index + 1 })}
                          fill
             className="object-cover transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
        <div className="text-center py-12 bg-surface-2 rounded-lg">
                  <PhotoIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('galleries.detail.noImages')}
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
      <h3 className="text-lg font-medium text-foreground mb-4">
              {t('galleries.detail.info')}
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">{t('galleries.detail.status')}</span>
                <p className="text-sm font-medium text-green-600">{t('galleries.detail.active')}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('galleries.detail.imageCount')}</span>
        <p className="text-sm font-medium text-foreground">
                  {gallery.images.length}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('galleries.detail.createdLabel')}</span>
        <p className="text-sm font-medium text-foreground">
                  {formatDate(gallery.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">{t('galleries.detail.lastUpdated')}</span>
        <p className="text-sm font-medium text-foreground">
                  {formatDate(gallery.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
      <h3 className="text-lg font-medium text-foreground mb-4">
              {t('galleries.detail.actions')}
            </h3>
            <div className="space-y-3">
              <Link
                href={`/dashboard/galleries/${gallery.id}/edit`}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                {t('galleries.detail.editGallery')}
              </Link>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              {t('galleries.detail.apiRest')}
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-blue-600">{t('galleries.detail.allGalleries')}</span>
                <code className="block bg-blue-100 px-3 py-2 rounded text-xs text-blue-900 mt-1 break-all">
                  GET /api/public/{session.user.clientId}/galleries
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
