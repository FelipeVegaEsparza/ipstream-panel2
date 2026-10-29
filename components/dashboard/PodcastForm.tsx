'use client'
import { MusicalNoteIcon } from '@heroicons/react/24/outline'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { podcastSchema, type PodcastInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { FileUpload } from '@/components/ui/FileUpload'

interface PodcastFormProps {
  podcast?: any
  onSubmit: (data: PodcastInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function PodcastForm({ podcast, onSubmit, onCancel, isLoading = false }: PodcastFormProps) {
  const { t } = useDashboardI18n()
  const [imageUrl, setImageUrl] = useState(podcast?.imageUrl || '')
  const [audioUrl, setAudioUrl] = useState(podcast?.audioUrl || '')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<PodcastInput>({
    resolver: zodResolver(podcastSchema),
    defaultValues: {
      title: podcast?.title || '',
      description: podcast?.description || '',
      imageUrl: podcast?.imageUrl || '',
      audioUrl: podcast?.audioUrl || '',
      duration: podcast?.duration || '',
      episodeNumber: podcast?.episodeNumber || undefined,
      season: podcast?.season || '',
    }
  })

  const handleFormSubmit = async (data: PodcastInput) => {
    const formData = {
      ...data,
      imageUrl,
      audioUrl,
    }
    
    console.log('Podcast form data being submitted:', formData)
    console.log('Audio URL:', audioUrl)
    
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

        {/* Tipo de Contenido - Solo Audio */}
        <div className="card-light">
          <div className="flex items-center space-x-3">
      <MusicalNoteIcon className="h-6 w-6 text-signal" />
            <div>
              <h3 className="font-semibold text-foreground">{t('podcasts.audioTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('podcasts.audioNote')}</p>
            </div>
          </div>
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
          description={t('podcasts.imageHint')}
        />

        {/* Archivo de Audio */}
        <FileUpload
          value={audioUrl}
          onChange={(url) => {
            setAudioUrl(url)
            setValue('audioUrl', url)
          }}
          onRemove={() => {
            setAudioUrl('')
            setValue('audioUrl', '')
          }}
          accept="audio/*"
          fileType="audio"
          label={t('podcasts.audioFile')}
          description={t('podcasts.audioFileHint')}
        />

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
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? t('common.saving') : podcast ? t('podcasts.update') : t('podcasts.create')}
          </button>
        </div>
      </form>
    </div>
  )
}