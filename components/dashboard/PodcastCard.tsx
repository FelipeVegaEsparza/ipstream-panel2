'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Podcast {
  id: string
  title: string
  description: string
  imageUrl?: string
  audioUrl?: string
  duration?: string
  episodeNumber?: number
  season?: string
  createdAt: string
  updatedAt: string
}

interface PodcastCardProps {
  podcast: Podcast
  onEdit: (podcast: Podcast) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function PodcastCard({ podcast, onEdit, onDelete, isDeleting = false }: PodcastCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    onDelete(podcast.id)
    setShowDeleteConfirm(false)
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es
    })
  }

  const getFileIcon = () => {
    return '🎵'
  }

  const getFileTypeLabel = () => {
    return 'Podcast'
  }

  return (
    <div className="card-content group">
      {/* Header con imagen */}
      <div className="relative h-48 bg-gradient-to-br from-purple-500 to-blue-600">
        {podcast.imageUrl ? (
          <Image
            src={podcast.imageUrl}
            alt={podcast.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-6xl opacity-80 text-white">
              {getFileIcon()}
            </div>
          </div>
        )}
        
        {/* Overlay con información */}
        <div className="overlay-gradient" />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex space-x-2 z-10">
          <span className="badge badge-secondary backdrop-blur-sm">
            {getFileTypeLabel()}
          </span>
          {podcast.episodeNumber && (
            <span className="badge badge-primary backdrop-blur-sm">
              Ep. {podcast.episodeNumber}
            </span>
          )}
        </div>

        {/* Duración */}
        {podcast.duration && (
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            {podcast.duration}
          </div>
        )}

        {/* Botones de acción */}
        <div className="absolute bottom-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={() => onEdit(podcast)}
            className="action-button action-button-edit"
            title="Editar episodio"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="action-button action-button-delete"
            title="Eliminar episodio"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-title mb-1 line-clamp-2">
              {podcast.title}
            </h3>
            
            {podcast.season && (
              <p className="text-subtitle mb-2">
                {podcast.season}
              </p>
            )}
          </div>
        </div>

        <p className="text-description mb-4">
          {podcast.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-meta">
          <span>
            Publicado {formatDate(podcast.createdAt)}
          </span>
          
          {/* Indicador de archivo */}
          <div className="flex items-center space-x-1">
            <span>{getFileIcon()}</span>
            <span>Audio</span>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <h3 className="text-lg font-bold text-primary mb-2">
                ¿Eliminar episodio?
              </h3>
              <p className="text-secondary mb-6">
                Esta acción no se puede deshacer. El episodio "{podcast.title}" será eliminado permanentemente.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Estilos CSS para line-clamp
const styles = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}