'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { VideocastCard } from '@/components/dashboard/VideocastCard'
import { VideocastForm } from '@/components/dashboard/VideocastForm'
import { type VideocastInput } from '@/lib/validations'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader'

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
      <div className="space-y-5">
        <DashboardPageHeader
          title={editingVideocast ? t('podcasts.edit') : t('podcasts.new')}
          description={editingVideocast ? t('videocasts.editSubtitle') : t('videocasts.newSubtitle')}
        />

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
    <div className="space-y-5">
      <DashboardPageHeader
        title={t('videocasts.title')}
        description={t('videocasts.subtitle')}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary h-9 text-[12px]"
          >
            {t('podcasts.new')}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="dashboard-panel p-4">
          <p className="text-[11px] text-muted-foreground">{t('podcasts.total')}</p>
          <p className="dashboard-metric mt-1 text-[24px] font-medium text-foreground">{videocasts.length}</p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-[11px] text-muted-foreground">{t('podcasts.seasons')}</p>
          <p className="dashboard-metric mt-1 text-[24px] font-medium text-foreground">
            {new Set(videocasts.filter((v) => v.season).map((v) => v.season)).size}
          </p>
        </div>
        <div className="dashboard-panel p-4">
          <p className="text-[11px] text-muted-foreground">{t('podcasts.last')}</p>
          <p className="dashboard-metric mt-1 text-[24px] font-medium text-foreground">
            {videocasts.length ? Math.max(...videocasts.map((v) => v.episodeNumber || 0)) : 0}
          </p>
        </div>
      </div>

      {/* Lista de Videocasts */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-3 h-5 w-5 animate-spin rounded-full border-2 border-line border-t-[color:var(--text-2)]" />
            <p className="text-[12px] text-muted-foreground">{t('podcasts.loading')}</p>
          </div>
        </div>
      ) : videocasts.length === 0 ? (
        <div className="dashboard-panel px-4 py-10 text-center">
          <h3 className="text-[15px] font-medium text-foreground">
            {t('podcasts.empty')}
          </h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {t('videocasts.emptyHint')}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4 h-9 text-[12px]"
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