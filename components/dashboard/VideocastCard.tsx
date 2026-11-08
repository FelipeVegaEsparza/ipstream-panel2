'use client'
import { TrashIcon } from '@heroicons/react/24/outline'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface Videocast {
  id: string
  title: string
  description: string
  imageUrl?: string
  videoUrl?: string
  duration?: string
  episodeNumber?: number
  season?: string
  createdAt: string
  updatedAt: string
}

interface VideocastCardProps {
  videocast: Videocast
  onEdit: (videocast: Videocast) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function VideocastCard({ videocast, onEdit, onDelete, isDeleting = false }: VideocastCardProps) {
  const { t, locale } = useDashboardI18n()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    onDelete(videocast.id)
    setShowDeleteConfirm(false)
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: locale === 'en' ? enUS : es
    })
  }

  return (
    <div className="card-content group">
      {/* Header con imagen */}
   <div className="relative aspect-video overflow-hidden border-b border-line bg-surface-3">
        {videocast.imageUrl ? (
          <Image
            src={videocast.imageUrl}
            alt={videocast.title}
            fill
      className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            Videocast
          </div>
        )}
        
        {/* Overlay con información */}
        <div className="overlay-gradient" />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex space-x-2 z-10">
     <span className="badge badge-secondary ">
            Videocast
          </span>
          {videocast.episodeNumber && (
      <span className="badge badge-danger ">
              Ep. {videocast.episodeNumber}
            </span>
          )}
        </div>

        {/* Duración */}
        {videocast.duration && (
     <div className="absolute right-3 top-3 z-10 rounded-[4px] border border-line bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {videocast.duration}
          </div>
        )}

        {/* Botones de acción */}
        <div className="absolute bottom-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={() => onEdit(videocast)}
            className="action-button action-button-edit"
            title={t('podcasts.edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="action-button action-button-delete"
            title={t('podcasts.deleteEpisode')}
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
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-title mb-1 line-clamp-2">
              {videocast.title}
            </h3>
            
            {videocast.season && (
              <p className="mb-2 text-[11px] text-muted-foreground">
                {videocast.season}
              </p>
            )}
          </div>
        </div>

        <p className="text-description mb-4">
          {videocast.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-meta">
          <span>
            {t('podcasts.published', { date: formatDate(videocast.createdAt) })}
          </span>
          
          {/* Indicador de archivo */}
          <span>{t('videocasts.videoLabel')}</span>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4">
            <div className="text-center">
       <div className="mb-4 flex justify-center text-danger"><TrashIcon className="h-9 w-9" /></div>
              <h3 className="mb-2 text-[15px] font-medium text-foreground">
                {t('podcasts.deleteTitle')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('podcasts.deleteText', { title: videocast.title })}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-danger flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? t('podcasts.deleting') : t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
