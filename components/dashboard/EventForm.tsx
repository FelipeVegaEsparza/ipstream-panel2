'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSchema, type EventInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface EventFormProps {
  initialData?: {
    id: string
    title: string
    description: string
    date: Date
    time?: string | null
    location?: string | null
    eventUrl?: string | null
    imageUrl?: string | null
  } | null
}

function toLocalDatetime(date: Date): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function EventForm({ initialData }: EventFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      date: initialData ? toLocalDatetime(initialData.date) : '',
      time: initialData?.time || '',
      location: initialData?.location || '',
      eventUrl: initialData?.eventUrl || '',
      imageUrl: initialData?.imageUrl || '',
    },
  })

  const onSubmit = async (data: EventInput) => {
    setLoading(true)
    try {
      const url = initialData ? `/api/events/${initialData.id}` : '/api/events'
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/events')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || 'Error al guardar el evento' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al guardar el evento' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="title" className="form-label">Título del Evento *</label>
        <input type="text" id="title" className="form-input" placeholder="Ej: Concierto Benéfico" {...register('title')} />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">Descripción *</label>
        <textarea id="description" rows={4} className="form-textarea" placeholder="Describe el evento..." {...register('description')} />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="date" className="form-label">Fecha *</label>
          <input type="date" id="date" className="form-input" {...register('date')} />
          {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
        </div>
        <div className="form-group">
          <label htmlFor="time" className="form-label">Hora</label>
          <input type="time" id="time" className="form-input" {...register('time')} />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="location" className="form-label">Ubicación / Lugar</label>
        <input type="text" id="location" className="form-input" placeholder="Ej: Teatro Principal, Av. Siempre Viva 123" {...register('location')} />
      </div>

      <div className="form-group">
        <label htmlFor="eventUrl" className="form-label">Enlace del Evento</label>
        <input type="url" id="eventUrl" className="form-input" placeholder="https://ejemplo.com/evento" {...register('eventUrl')} />
        {errors.eventUrl && <p className="text-sm text-red-600">{errors.eventUrl.message}</p>}
      </div>

      <ImageUpload
        label="Imagen del Evento"
        description="Imagen promocional del evento (recomendado: 800x400px)"
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Guardando...' : initialData ? 'Actualizar Evento' : 'Crear Evento'}
        </button>
      </div>
    </form>
  )
}
