'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { PodcastCard } from '@/components/dashboard/PodcastCard'
import { PodcastForm } from '@/components/dashboard/PodcastForm'
import { type PodcastInput } from '@/lib/validations'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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

export default function PodcastsPage() {
  const { t } = useDashboardI18n()
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Cargar podcasts
  const loadPodcasts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/podcasts')
      if (response.ok) {
        const data = await response.json()
        setPodcasts(data)
      } else {
        console.error('Error loading podcasts:', response.statusText)
      }
    } catch (error) {
      console.error('Error loading podcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPodcasts()
  }, [])

  // Crear nuevo podcast
  const handleCreate = async (data: PodcastInput) => {
    try {
      console.log('🎙️ Starting podcast creation with data:', data)
      setSubmitting(true)
      
      const response = await fetch('/api/podcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('🎙️ API Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('🎙️ Podcast created successfully:', result)
        await loadPodcasts()
        setShowForm(false)
        setEditingPodcast(null)
      } else {
        const error = await response.json()
        console.error('🎙️ API Error:', error)
        showToast({ type: 'error', title: error.error || t('podcasts.createError') })
      }
    } catch (error) {
      console.error('🎙️ Network/Parse Error:', error)
      showToast({ type: 'error', title: t('podcasts.createError') })
    } finally {
      setSubmitting(false)
    }
  }

  // Actualizar podcast
  const handleUpdate = async (data: PodcastInput) => {
    if (!editingPodcast) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/podcasts/${editingPodcast.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await loadPodcasts()
        setShowForm(false)
        setEditingPodcast(null)
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('podcasts.updateError') })
      }
    } catch (error) {
      console.error('Error updating podcast:', error)
      showToast({ type: 'error', title: t('podcasts.updateError') })
    } finally {
      setSubmitting(false)
    }
  }

  // Eliminar podcast
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const response = await fetch(`/api/podcasts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadPodcasts()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('podcasts.deleteError') })
      }
    } catch (error) {
      console.error('Error deleting podcast:', error)
      showToast({ type: 'error', title: t('podcasts.deleteError') })
    } finally {
      setDeletingId(null)
    }
  }

  // Manejar edición
  const handleEdit = (podcast: Podcast) => {
    setEditingPodcast(podcast)
    setShowForm(true)
  }

  // Cancelar formulario
  const handleCancel = () => {
    setShowForm(false)
    setEditingPodcast(null)
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {editingPodcast ? t('podcasts.edit') : t('podcasts.new')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {editingPodcast 
                ? t('podcasts.editSubtitle')
                : t('podcasts.newSubtitle')
              }
            </p>
          </div>
        </div>

        <div className="card">
          <PodcastForm
            podcast={editingPodcast}
            onSubmit={editingPodcast ? handleUpdate : handleCreate}
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
            {t('podcasts.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('podcasts.subtitle')}
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
     className="flex items-center gap-2 rounded-control bg-signal px-4 py-2 text-xs font-medium text-white transition-colors hover:brightness-110"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{t('podcasts.new')}</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="dashboard-panel p-5">
          <div className="flex items-center justify-between">
            <div>
       <p className="text-muted-foreground">{t('podcasts.total')}</p>
       <p className="dashboard-metric text-2xl font-medium text-foreground">{podcasts.length}</p>
            </div>
      
          </div>
        </div>

    <div className="dashboard-panel p-5">
          <div className="flex items-center justify-between">
            <div>
       <p className="text-muted-foreground">{t('podcasts.seasons')}</p>
       <p className="dashboard-metric text-2xl font-medium text-foreground">
                {new Set(podcasts.filter(p => p.season).map(p => p.season)).size || 0}
              </p>
            </div>
      
          </div>
        </div>

    <div className="dashboard-panel p-5">
          <div className="flex items-center justify-between">
            <div>
       <p className="text-muted-foreground">{t('podcasts.last')}</p>
       <p className="dashboard-metric text-2xl font-medium text-foreground">
                {Math.max(...podcasts.map(p => p.episodeNumber || 0)) || 0}
              </p>
            </div>
      
          </div>
        </div>
      </div>

      {/* Lista de Podcasts */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
      <div className="w-12 h-12 border-4 border-signal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('podcasts.loading')}</p>
          </div>
        </div>
      ) : podcasts.length === 0 ? (
        <div className="text-center py-12">
     <span className="mx-auto mb-4 block h-px w-10 bg-signal" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {t('podcasts.empty')}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t('podcasts.emptyHint')}
          </p>
          <button
            onClick={() => setShowForm(true)}
      className="rounded-control bg-signal px-4 py-2 text-xs font-medium text-white transition-colors hover:brightness-110"
          >
            {t('podcasts.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {podcasts.map((podcast) => (
            <PodcastCard
              key={podcast.id}
              podcast={podcast}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === podcast.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}