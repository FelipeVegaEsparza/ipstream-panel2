'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface NewsItem {
  id: string
  name: string
  slug: string
  shortText: string
  longText: string
  imageUrl?: string | null
  createdAt: Date
}

interface NewsListProps {
  news: NewsItem[]
}

export function NewsList({ news }: NewsListProps) {
  const { t, locale } = useDashboardI18n()
  const intlLocale = locale === 'en' ? 'en-US' : 'es-ES'
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('news.confirmDelete'))) {
      return
    }

    setLoading(id)
    try {
      const response = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        showToast({ type: 'error', title: t('news.deleteError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('news.deleteError') })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('news.emptyTitle')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('news.emptyHint2')}
        </p>
        <Link href="/dashboard/news/new" className="btn-primary">
          {t('news.create')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {news.map((item) => (
        <div key={item.id} className="card">
          <div className="flex gap-6">
            {item.imageUrl && (
              <div className="flex-shrink-0">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={200}
                  height={120}
                  className="w-48 h-28 object-cover rounded-lg"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {item.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                    {item.shortText}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground space-x-4">
                    <span><span className="font-semibold text-brand">{t('news.published')}</span> {formatDate(item.createdAt)}</span>
                    <span><span className="font-semibold text-brand">{t('news.slug')}</span> <code className="bg-secondary text-brand px-2 py-1 rounded text-xs">{item.slug}</code></span>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Link
                    href={`/dashboard/news/${item.id}`}
                    className="action-button action-button-view"
                    title={t('news.view')}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/news/${item.id}/edit`}
                    className="action-button action-button-edit"
                    title={t('news.edit')}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={loading === item.id}
                    className="action-button action-button-delete"
                    title={t('news.delete')}
                  >
                    {loading === item.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground line-clamp-3">
                {item.longText.substring(0, 200)}...
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}