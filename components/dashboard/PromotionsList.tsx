'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, TrashIcon, EyeIcon, LinkIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Promotion {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  link?: string | null
  createdAt: Date
}

interface PromotionsListProps {
  promotions: Promotion[]
}

export function PromotionsList({ promotions }: PromotionsListProps) {
  const { t, locale } = useDashboardI18n()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('promotions.confirmDelete'))) {
      return
    }

    setLoading(id)
    try {
      const response = await fetch(`/api/promotions/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        showToast({ type: 'error', title: t('promotions.deleteError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('promotions.deleteError') })
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
      minute: '2-digit'
    }).format(new Date(date))
  }

  if (promotions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('promotions.empty')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('promotions.emptyHintActual')}
        </p>
        <Link href="/dashboard/promotions/new" className="btn-primary">
          {t('promotions.create')}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {promotions.map((promotion) => (
        <div key={promotion.id} className="card">
          {/* Image */}
          {promotion.imageUrl && (
            <div className="mb-4">
              <Image
                src={promotion.imageUrl}
                alt={promotion.title}
                width={400}
                height={200}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          
          {/* Content */}
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {promotion.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-3">
                {promotion.description}
              </p>
            </div>

            {/* Link */}
            {promotion.link && (
              <div className="flex items-center text-sm">
                <LinkIcon className="h-4 w-4 text-brand mr-2" />
                <a
                  href={promotion.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand truncate transition-colors"
                >
                  {promotion.link}
                </a>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {t('promotions.created', { date: formatDate(promotion.createdAt) })}
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Link
                href={`/dashboard/promotions/${promotion.id}`}
                className="action-button action-button-view"
                title={t('promotions.view')}
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link
                href={`/dashboard/promotions/${promotion.id}/edit`}
                className="action-button action-button-edit"
                title={t('promotions.edit')}
              >
                <PencilIcon className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(promotion.id)}
                disabled={loading === promotion.id}
                className="action-button action-button-delete"
                title={t('promotions.delete')}
              >
                {loading === promotion.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}