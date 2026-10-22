'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, TrashIcon, EyeIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface GalleryImage {
  id: string
  imageUrl: string
  order: number
}

interface Gallery {
  id: string
  title: string
  description: string
  images: GalleryImage[]
  createdAt: Date
}

interface GalleriesListProps {
  galleries: Gallery[]
}

export function GalleriesList({ galleries }: GalleriesListProps) {
  const { t, locale } = useDashboardI18n()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('galleries.confirmDelete'))) {
      return
    }

    setLoading(id)
    try {
      const response = await fetch(`/api/galleries/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        showToast({ type: 'error', title: t('galleries.deleteError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('galleries.deleteError') })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  if (galleries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <PhotoIcon className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('galleries.empty')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('galleries.emptyHint')}
        </p>
        <Link href="/dashboard/galleries/new" className="btn-primary">
          {t('galleries.create')}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {galleries.map((gallery) => {
        const coverImage = gallery.images[0]

        return (
          <div key={gallery.id} className="card">
            {/* Cover Image */}
            {coverImage ? (
              <div className="mb-4 relative h-48 rounded-lg overflow-hidden">
                <Image
                  src={coverImage.imageUrl}
                  alt={gallery.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 bg-black/60 text-foreground text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  {t('galleries.images', { count: gallery.images.length, plural: gallery.images.length === 1 ? '' : (locale === 'en' ? 's' : 'es') })}
                </div>
              </div>
            ) : (
              <div className="mb-4 h-48 bg-secondary/50 rounded-lg flex items-center justify-center">
                <PhotoIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Content */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {gallery.title}
                </h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {gallery.description}
                </p>
              </div>

              {/* Thumbnails strip */}
              {gallery.images.length > 1 && (
                <div className="flex gap-1">
                  {gallery.images.slice(0, 4).map((img) => (
                    <div
                      key={img.id}
                      className="w-8 h-8 rounded overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={img.imageUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {gallery.images.length > 4 && (
                    <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                      +{gallery.images.length - 4}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {t('galleries.list.created', { date: formatDate(gallery.createdAt) })}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Link
                  href={`/dashboard/galleries/${gallery.id}`}
                  className="action-button action-button-view"
                  title={t('galleries.view')}
                >
                  <EyeIcon className="h-4 w-4" />
                </Link>
                <Link
                  href={`/dashboard/galleries/${gallery.id}/edit`}
                  className="action-button action-button-edit"
                  title={t('galleries.edit')}
                >
                  <PencilIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(gallery.id)}
                  disabled={loading === gallery.id}
                  className="action-button action-button-delete"
                  title={t('galleries.delete')}
                >
                  {loading === gallery.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
