'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { PodcastCard } from '@/components/dashboard/PodcastCard'
import { PodcastForm } from '@/components/dashboard/PodcastForm'
import { type PodcastInput } from '@/lib/validations'

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
        showToast({ type: 'error', title: error.error || 'Error al crear el episodio' })
      }
    } catch (error) {
      console.error('🎙️ Network/Parse Error:', error)
      showToast({ type: 'error', title: 'Error al crear el episodio' })
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
        showToast({ type: 'error', title: error.error || 'Error al actualizar el episodio' })
      }
    } catch (error) {
      console.error('Error updating podcast:', error)
      showToast({ type: 'error', title: 'Error al actualizar el episodio' })
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
        showToast({ type: 'error', title: error.error || 'Error al eliminar el episodio' })
      }
    } catch (error) {
      console.error('Error deleting podcast:', error)
      showToast({ type: 'error', title: 'Error al eliminar el episodio' })
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
            <h1 className="text-3xl font-bold text-primary">
              {editingPodcast ? 'Editar Episodio' : 'Nuevo Episodio'}
            </h1>
            <p className="text-secondary mt-2">
              {editingPodcast 
                ? 'Actualiza la información del episodio de podcast' 
                : 'Crea un nuevo episodio de podcast de audio'
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
          <h1 className="text-3xl font-bold text-primary">
            🎙️ Podcasts
          </h1>
          <p className="text-secondary mt-2">
            Gestiona los episodios de tu podcast de audio
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nuevo Episodio</span>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Total Episodios</p>
              <p className="text-3xl font-bold">{podcasts.length}</p>
            </div>
            <div className="text-4xl opacity-80">🎙️</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Temporadas</p>
              <p className="text-3xl font-bold">
                {new Set(podcasts.filter(p => p.season).map(p => p.season)).size || 0}
              </p>
            </div>
            <div className="text-4xl opacity-80">🎵</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100">Último Episodio</p>
              <p className="text-3xl font-bold">
                {Math.max(...podcasts.map(p => p.episodeNumber || 0)) || 0}
              </p>
            </div>
            <div className="text-4xl opacity-80">🎧</div>
          </div>
        </div>
      </div>

      {/* Lista de Podcasts */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary">Cargando episodios...</p>
          </div>
        </div>
      ) : podcasts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎙️</div>
          <h3 className="text-xl font-semibold text-primary mb-2">
            No hay episodios aún
          </h3>
          <p className="text-secondary mb-6">
            Crea tu primer episodio de podcast de audio para comenzar
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
          >
            Crear Primer Episodio
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