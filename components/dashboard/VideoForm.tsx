'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { rankingVideoSchema, type RankingVideoInput } from '@/lib/validations'

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
        alert(error.error || 'Error al guardar el video')
      }
    } catch (error) {
      alert('Error al guardar el video')
    } finally {
      setLoading(false)
    }
  }

  const thumbnail = getVideoThumbnail(watchVideoUrl)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          Nombre del Video *
        </label>
        <input
          type="text"
          id="name"
          className="form-input"
          placeholder="Ej: Canción del momento - Artista"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="videoUrl" className="form-label">
          URL del Video *
        </label>
        <input
          type="url"
          id="videoUrl"
          className="form-input"
          placeholder="https://www.youtube.com/watch?v=..."
          {...register('videoUrl')}
        />
        <p className="text-xs text-gray-500 mt-1">
          Soporta URLs de YouTube, Vimeo y otros servicios de video
        </p>
        {errors.videoUrl && (
          <p className="text-sm text-red-600">{errors.videoUrl.message}</p>
        )}
        
        {/* Preview thumbnail */}
        {thumbnail && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
            <img
              src={thumbnail}
              alt="Vista previa del video"
              className="w-48 h-28 object-cover rounded-lg border"
            />
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Descripción *
        </label>
        <textarea
          id="description"
          rows={4}
          className="form-textarea"
          placeholder="Describe el video, artista, género, por qué está en el ranking..."
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
                Posición en el ranking
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  El video se agregará automáticamente al final del ranking. 
                  Podrás cambiar su posición después usando las flechas de ordenamiento.
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
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Agregar al Ranking')}
        </button>
      </div>
    </form>
  )
}