'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PencilIcon, TrashIcon, EyeIcon, CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/outline'

interface Event {
  id: string
  title: string
  description: string
  date: Date
  time?: string | null
  location?: string | null
  eventUrl?: string | null
  imageUrl?: string | null
  createdAt: Date
}

interface EventsListProps {
  events: Event[]
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date))
}

function isPast(date: Date) {
  return new Date(date) < new Date(new Date().toDateString())
}

export function EventsList({ events }: EventsListProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este evento?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else showToast({ type: 'error', title: 'Error al eliminar' })
    } catch {
      showToast({ type: 'error', title: 'Error al eliminar' })
    } finally {
      setDeleting(null)
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-muted mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No hay eventos</h3>
        <p className="text-secondary mb-4">Agrega eventos y transmisiones especiales</p>
        <Link href="/dashboard/events/new" className="btn-primary">Crear Evento</Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const past = isPast(event.date)
        return (
          <div key={event.id} className={`card ${past ? 'opacity-60' : ''}`}>
            {event.imageUrl && (
              <div className="mb-4 relative h-40 rounded-lg overflow-hidden">
                <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
                {past && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold uppercase tracking-wider">Finalizado</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-primary">{event.title}</h3>
              <div className="flex items-center text-sm text-secondary gap-1.5">
                <CalendarDaysIcon className="h-4 w-4 text-cyan-400" />
                <span>{formatDate(event.date)}{event.time ? ` - ${event.time}` : ''}</span>
              </div>
              {event.location && (
                <div className="flex items-center text-sm text-secondary gap-1.5">
                  <MapPinIcon className="h-4 w-4 text-cyan-400" />
                  <span>{event.location}</span>
                </div>
              )}
              <p className="text-secondary text-sm line-clamp-2">{event.description}</p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-700 mt-3">
              <Link href={`/dashboard/events/${event.id}`} className="action-button action-button-view" title="Ver evento">
                <EyeIcon className="h-4 w-4" />
              </Link>
              <Link href={`/dashboard/events/${event.id}/edit`} className="action-button action-button-edit" title="Editar evento">
                <PencilIcon className="h-4 w-4" />
              </Link>
              <button onClick={() => handleDelete(event.id)} disabled={deleting === event.id} className="action-button action-button-delete" title="Eliminar evento">
                {deleting === event.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
