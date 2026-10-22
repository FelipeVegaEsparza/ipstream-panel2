'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rankingVideoSchema, type RankingVideoInput } from '@/lib/validations'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface VideoFormProps {
  initialData?: {
    id: string
    name: string
    videoUrl: string
    description: string
    order: number
  } | null
}

export function VideoForm({ initialData }: VideoFormProps) {
  const { t } = useDashboardI18n()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RankingVideoInput>({
    resolver: zodResolver(rankingVideoSchema),
    defaultValues: {
      name: initialData?.name || '',
      videoUrl: initialData?.videoUrl || '',
      description: initialData?.description || '',
    },
  })

  const watchVideoUrl = watch('videoUrl')

  const getVideoThumbnail = (url: string) => {
    if (!url) return null
    
    // Extraer thumbnail de YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = ''
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0]
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0]
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      }
    }
    return null
  }

  const onSubmit = async (data: RankingVideoInput) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/videos/${initialData.id}` 
        : '/api/videos'
      
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/videos')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('videos.form.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('videos.form.saveError') })
    } finally {
      setLoading(false)
    }
  }

  const thumbnail = getVideoThumbnail(watchVideoUrl)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          {t('videos.form.name')}
        </label>
        <input
          type="text"
          id="name"
          className="form-input"
          placeholder={t('videos.form.namePlaceholder')}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="videoUrl" className="form-label">
          {t('videos.form.url')}
        </label>
        <input
          type="url"
          id="videoUrl"
          className="form-input"
          placeholder="https://www.youtube.com/watch?v=..."
          {...register('videoUrl')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('videos.form.urlHint')}
        </p>
        {errors.videoUrl && (
          <p className="text-sm text-red-600">{errors.videoUrl.message}</p>
        )}
        
        {/* Preview thumbnail */}
        {thumbnail && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">{t('videos.form.preview')}</p>
            <img
              src={thumbnail}
              alt={t('videos.form.previewAlt')}
              className="w-48 h-28 object-cover rounded-lg border"
            />
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          {t('videos.form.description')}
        </label>
        <textarea
          id="description"
          rows={4}
          className="form-textarea"
          placeholder={t('videos.form.descriptionPlaceholder')}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {!initialData && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {t('videos.form.positionTitle')}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  {t('videos.form.positionHint')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? t('common.saving') : (initialData ? t('videos.form.update') : t('videos.form.add'))}
        </button>
      </div>
    </form>
  )
}