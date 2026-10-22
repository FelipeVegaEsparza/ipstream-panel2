'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { VideocastCard } from '@/components/dashboard/VideocastCard'
import { VideocastForm } from '@/components/dashboard/VideocastForm'
import { type VideocastInput } from '@/lib/validations'
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

export default function VideocastsPage() {
  const { t } = useDashboardI18n()
  const [videocasts, setVideocasts] = useState<Videocast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVideocast, setEditingVideocast] = useState<Videocast | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Cargar videocasts
  const loadVideocasts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/videocasts')
      if (response.ok) {
        const data = await response.json()
        setVideocasts(data)
      } else {
        console.error('Error loading videocasts:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading videocasts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideocasts()
  }, [])

  // Crear nuevo videocast
  const handleCreate = async (data: VideocastInput) => {
    try {
      console.log('🎥 Starting videocast creation with data:', data)
      setSubmitting(true)
      
      const response = await fetch('/api/videocasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('🎥 API Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('🎥 Videocast created successfully:', result)
        await loadVideocasts()
        setShowForm(false)
        setEditingVideocast(null)
      } else {
        const error = await response.json()
        console.error('🎥 API Error:', error)
        showToast({ type: 'error', title: error.error || t('podcasts.createError') })
      }
    } catch (error) {
      console.error('🎥 Network/Parse Error:', error)
      showToast({ type: 'error', title: t('podcasts.createError') })
    } finally {
      setSubmitting(false)
    }
  }

  // Actualizar videocast
  const handleUpdate = async (data: VideocastInput) => {
    if (!editingVideocast) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/videocasts/${editingVideocast.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await loadVideocasts()
        setShowForm(false)
        setEditingVideocast(null)
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('podcasts.updateError') })
      }
    } catch (error) {
      console.error('Error updating videocast:', error)
      showToast({ type: 'error', title: t('podcasts.updateError') })
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar videocast
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const response = await fetch(`/api/videocasts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadVideocasts()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('podcasts.deleteError') })
      }
    } catch (error) {
      console.error('Error deleting videocast:', error)
      showToast({ type: 'error', title: t('podcasts.deleteError') })
    } finally {
      setDeletingId(null)
    }
  }

  // Manejar edición
  const handleEdit = (videocast: Videocast) => {
    setEditingVideocast(videocast)
    setShowForm(true)
  }

  // Cancelar formulario
  const handleCancel = () => {
    setShowForm(false)
    setEditingVideocast(null)
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {editingVideocast ? t('podcasts.edit') : t('podcasts.new')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {editingVideocast 
                ? t('videocasts.editSubtitle')
                : t('videocasts.newSubtitle')
              }
            </p>
          </div>
        </div>

        <div className="card">
          <VideocastForm
            videocast={editingVideocast}
            onSubmit={editingVideocast ? handleUpdate : handleCreate}
            onCancel={handleCancel}
            isLoading={submitting}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('videocasts.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('videocasts.subtitle')}
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('podcasts.new')}</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100">{t('podcasts.total')}</p>
              <p className="text-3xl font-bold">{videocasts.length}</p>
            </div>
            <div className="text-4xl opacity-80">🎥</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100">{t('podcasts.seasons')}</p>
              <p className="text-3xl font-bold">
                {new Set(videocasts.filter(v => v.season).map(v => v.season)).size || 0}
              </p>
            </div>
            <div className="text-4xl opacity-80">📺</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">{t('podcasts.last')}</p>
              <p className="text-3xl font-bold">
                {Math.max(...videocasts.map(v => v.episodeNumber || 0)) || 0}
              </p>
            </div>
            <div className="text-4xl opacity-80">🎬</div>
          </div>
        </div>
      </div>

      {/* Lista de Videocasts */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('podcasts.loading')}</p>
          </div>
        </div>
      ) : videocasts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎥</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('podcasts.empty')}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t('videocasts.emptyHint')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
          >
            {t('podcasts.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videocasts.map((videocast) => (
            <VideocastCard
              key={videocast.id}
              videocast={videocast}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === videocast.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}