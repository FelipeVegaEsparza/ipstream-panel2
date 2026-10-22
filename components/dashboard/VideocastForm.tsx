'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { videocastSchema, type VideocastInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface VideocastFormProps {
  videocast?: any
  onSubmit: (data: VideocastInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function VideocastForm({ videocast, onSubmit, onCancel, isLoading = false }: VideocastFormProps) {
  const { t } = useDashboardI18n()
  const [imageUrl, setImageUrl] = useState(videocast?.imageUrl || '')

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VideocastInput>({
    resolver: zodResolver(videocastSchema),
    defaultValues: {
      title: videocast?.title || '',
      description: videocast?.description || '',
      imageUrl: videocast?.imageUrl || '',
      videoUrl: videocast?.videoUrl || '',
      duration: videocast?.duration || '',
      episodeNumber: videocast?.episodeNumber || undefined,
      season: videocast?.season || '',
    }
  })

  const handleFormSubmit = async (data: VideocastInput) => {
    const formData = {
      ...data,
      imageUrl,
    }
    
    console.log('Videocast form data being submitted:', formData)
    console.log('Video URL:', data.videoUrl)
    
    await onSubmit(formData)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Título */}
        <div>
          <label className="form-label">
            {t('podcasts.episodeTitle')}
          </label>
          <input
            {...register('title')}
            type="text"
            className="form-input"
            placeholder={t('podcasts.episodeTitlePlaceholder')}
          />
          {errors.title && (
            <p className="form-error">{errors.title.message}</p>
          )}
        </div>

        {/* Número de Episodio y Temporada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              {t('podcasts.episodeNumber')}
            </label>
            <input
              {...register('episodeNumber', { 
                setValueAs: (value) => value === '' ? undefined : parseInt(value) 
              })}
              type="number"
              min="1"
              className="form-input"
              placeholder="1"
            />
            {errors.episodeNumber && (
              <p className="form-error">{errors.episodeNumber.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              {t('podcasts.season')}
            </label>
            <input
              {...register('season')}
              type="text"
              className="form-input"
              placeholder={t('podcasts.seasonPlaceholder')}
            />
            {errors.season && (
              <p className="form-error">{errors.season.message}</p>
            )}
          </div>
        </div>

        {/* Duración */}
        <div>
          <label className="form-label">
            {t('podcasts.duration')}
          </label>
          <input
            {...register('duration')}
            type="text"
            className="form-input"
            placeholder={t('podcasts.durationPlaceholder')}
          />
          <p className="form-help mt-1">
            {t('podcasts.durationHelp')}
          </p>
          {errors.duration && (
            <p className="form-error">{errors.duration.message}</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="form-label">
            {t('podcasts.description')}
          </label>
          <textarea
            {...register('description')}
            rows={6}
            className="form-input resize-vertical"
            placeholder={t('podcasts.descriptionPlaceholder')}
          />
          <p className="form-help mt-1">
            {t('podcasts.descriptionHelp')}
          </p>
          {errors.description && (
            <p className="form-error">{errors.description.message}</p>
          )}
        </div>

        {/* Imagen del Episodio */}
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          onRemove={() => setImageUrl('')}
          label={t('podcasts.image')}
          description={t('videocasts.imageHint')}
        />

        {/* URL de YouTube */}
        <div>
          <label className="form-label">
            {t('videocasts.videoUrl')}
          </label>
          <input
            {...register('videoUrl')}
            type="url"
            className="form-input"
            placeholder={t('videocasts.videoUrlPlaceholder')}
          />
          <p className="form-help mt-1">
            {t('videocasts.videoUrlHelp')}
          </p>
          {errors.videoUrl && (
            <p className="form-error">{errors.videoUrl.message}</p>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isLoading}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isLoading}
          >
            {isLoading ? t('common.saving') : videocast ? t('podcasts.update') : t('podcasts.create')}
          </button>
        </div>
      </form>
    </div>
  )
}