'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { videocastSchema, type VideocastInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface VideocastFormProps {
  videocast?: any
  onSubmit: (data: VideocastInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function VideocastForm({ videocast, onSubmit, onCancel, isLoading = false }: VideocastFormProps) {
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
            Título del Episodio *
          </label>
          <input
            {...register('title')}
            type="text"
            className="form-input"
            placeholder="Ej: Episodio 1 - Introducción al Videocast"
          />
          {errors.title && (
            <p className="form-error">{errors.title.message}</p>
          )}
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
          description="Portada del episodio (recomendado: 1920x1080px - formato 16:9)"
        />

        {/* URL de YouTube */}
        <div>
          <label className="form-label">
            URL de YouTube *
          </label>
          <input
            {...register('videoUrl')}
            type="url"
            className="form-input"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="form-help mt-1">
            Pega aquí el enlace de tu video de YouTube
          </p>
          {errors.videoUrl && (
            <p className="form-error">{errors.videoUrl.message}</p>
          )}
        </div>

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
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={isLoading}
          >
            {isLoading ? 'Guardando...' : videocast ? 'Actualizar Episodio' : 'Crear Episodio'}
          </button>
        </div>
      </form>
    </div>
  )
}