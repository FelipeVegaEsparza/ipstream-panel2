'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { podcastSchema, type PodcastInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { FileUpload } from '@/components/ui/FileUpload'

interface PodcastFormProps {
  podcast?: any
  onSubmit: (data: PodcastInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function PodcastForm({ podcast, onSubmit, onCancel, isLoading = false }: PodcastFormProps) {
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
            Título del Episodio *
          </label>
          <input
            {...register('title')}
            type="text"
            className="form-input"
            placeholder="Ej: Episodio 1 - Introducción al Podcast"
          />
          {errors.title && (
            <p className="form-error">{errors.title.message}</p>
          )}
        </div>

        {/* Tipo de Contenido - Solo Audio */}
        <div className="card-light">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎵</div>
            <div>
              <h3 className="font-semibold text-primary">Podcast de Audio</h3>
              <p className="text-sm text-secondary">Este formulario es específico para episodios de audio</p>
            </div>
          </div>
        </div>

        {/* Número de Episodio y Temporada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              Número de Episodio
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
              Temporada
            </label>
            <input
              {...register('season')}
              type="text"
              className="form-input"
              placeholder="Temporada 1"
            />
            {errors.season && (
              <p className="form-error">{errors.season.message}</p>
            )}
          </div>
        </div>

        {/* Duración */}
        <div>
          <label className="form-label">
            Duración
          </label>
          <input
            {...register('duration')}
            type="text"
            className="form-input"
            placeholder="45:30 (minutos:segundos)"
          />
          <p className="form-help mt-1">
            Formato: MM:SS o HH:MM:SS (ej: 45:30 o 1:15:45)
          </p>
          {errors.duration && (
            <p className="form-error">{errors.duration.message}</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="form-label">
            Descripción del Episodio *
          </label>
          <textarea
            {...register('description')}
            rows={6}
            className="form-input resize-vertical"
            placeholder="Describe de qué trata este episodio, los temas que se abordan, invitados especiales, etc."
          />
          <p className="form-help mt-1">
            Esta descripción aparecerá como resumen en las listas de episodios
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
          label="Imagen del Episodio"
          description="Portada del episodio (recomendado: 1400x1400px - formato cuadrado)"
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
          label="Archivo de Audio *"
          description="Sube tu archivo de audio (MP3, WAV, M4A, AAC - Máx. 100MB)"
        />

        {/* Botones */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : podcast ? 'Actualizar Episodio' : 'Crear Episodio'}
          </button>
        </div>
      </form>
    </div>
  )
}