'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, TrashIcon, EyeIcon, MicrophoneIcon } from '@heroicons/react/24/outline'

interface Announcer {
  id: string
  name: string
  description: string
  imageUrl?: string | null
  createdAt: Date
}

interface AnnouncersListProps {
  announcers: Announcer[]
}

export function AnnouncersList({ announcers }: AnnouncersListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este locutor?')) return
    setLoading(id)
    try {
      const response = await fetch(`/api/announcers/${id}`, { method: 'DELETE' })
      if (response.ok) router.refresh()
      else showToast({ type: 'error', title: 'Error al eliminar el locutor' })
    } catch (error) {
      showToast({ type: 'error', title: 'Error al eliminar el locutor' })
    } finally {
      setLoading(null)
    }
  }

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))

  if (announcers.length === 0) {
    return (
      <div className="text-center py-12">
        <MicrophoneIcon className="mx-auto h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No hay locutores</h3>
        <p className="text-secondary mb-4">Agrega los locutores de tu radio</p>
        <Link href="/dashboard/announcers/new" className="btn-primary">Crear Locutor</Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {announcers.map((announcer) => (
        <div key={announcer.id} className="card">
          {announcer.imageUrl ? (
            <div className="mb-4 flex justify-center">
              <Image
                src={announcer.imageUrl}
                alt={announcer.name}
                width={120}
                height={120}
                className="w-28 h-28 object-cover rounded-full border-4 border-gray-600"
              />
            </div>
          ) : (
            <div className="mb-4 flex justify-center">
              <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                <MicrophoneIcon className="h-10 w-10 text-gray-500" />
              </div>
            </div>
          )}

          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-primary">{announcer.name}</h3>
            <p className="text-secondary text-sm line-clamp-3">{announcer.description}</p>
            <p className="text-xs text-muted">Creado: {formatDate(announcer.createdAt)}</p>
          </div>

          <div className="flex justify-center space-x-2 pt-3 border-t border-gray-700 mt-3">
            <Link href={`/dashboard/announcers/${announcer.id}`} className="action-button action-button-view" title="Ver locutor">
              <EyeIcon className="h-4 w-4" />
            </Link>
            <Link href={`/dashboard/announcers/${announcer.id}/edit`} className="action-button action-button-edit" title="Editar locutor">
              <PencilIcon className="h-4 w-4" />
            </Link>
            <button onClick={() => handleDelete(announcer.id)} disabled={loading === announcer.id} className="action-button action-button-delete" title="Eliminar locutor">
              {loading === announcer.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
