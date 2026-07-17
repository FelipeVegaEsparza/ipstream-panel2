'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, PlayIcon } from '@heroicons/react/24/outline'

interface Video {
  id: string
  name: string
  videoUrl: string
  description: string
  order: number
  createdAt: Date
}

interface VideosListProps {
  videos: Video[]
}

export function VideosList({ videos }: VideosListProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) {
      return
    }

    setLoading(id)
    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Error al eliminar el video')
      }
    } catch (error) {
      alert('Error al eliminar el video')
    } finally {
      setLoading(null)
    }
  }

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    setLoading(id)
    try {
      const response = await fetch(`/api/videos/${id}/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      })

      if (response.ok) {
        window.location.reload()
      } else {
        alert('Error al reordenar el video')
      }
    } catch (error) {
      alert('Error al reordenar el video')
    } finally {
      setLoading(null)
    }
  }

  const getVideoThumbnail = (url: string) => {
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date))
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-primary mb-2">
          No hay videos
        </h3>
        <p className="text-secondary mb-4">
          Comienza agregando tu primer video al ranking
        </p>
        <Link href="/dashboard/videos/new" className="btn-primary">
          Agregar Video
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {videos.map((video, index) => {
        const thumbnail = getVideoThumbnail(video.videoUrl)
        
        return (
          <div key={video.id} className="card">
            <div className="flex gap-4">
              {/* Ranking Number */}
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-cyan-500/20 text-accent rounded-full font-bold text-lg border border-cyan-500/30">
                #{video.order}
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0">
                {thumbnail ? (
                  <div className="relative">
                    <img
                      src={thumbnail}
                      alt={video.name}
                      className="w-32 h-20 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                      <PlayIcon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                    <PlayIcon className="h-8 w-8 text-muted" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-primary">
                    {video.name}
                  </h3>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    {/* Reorder buttons */}
                    <button
                      onClick={() => handleReorder(video.id, 'up')}
                      disabled={index === 0 || loading === video.id}
                      className="p-1 text-secondary hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Subir en el ranking"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReorder(video.id, 'down')}
                      disabled={index === videos.length - 1 || loading === video.id}
                      className="p-1 text-secondary hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Bajar en el ranking"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                    
                    {/* Action buttons */}
                    <Link
                      href={`/dashboard/videos/${video.id}/edit`}
                      className="action-button action-button-edit"
                      title="Editar video"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(video.id)}
                      disabled={loading === video.id}
                      className="action-button action-button-delete"
                      title="Eliminar video"
                    >
                      {loading === video.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <p className="text-secondary text-sm mb-2 line-clamp-2">
                  {video.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-muted">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-cyan-300 truncate max-w-xs transition-colors"
                  >
                    {video.videoUrl}
                  </a>
                  <span>Agregado: {formatDate(video.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}