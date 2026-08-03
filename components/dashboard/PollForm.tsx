'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pollSchema, type PollInput } from '@/lib/validations'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface PollFormProps {
  initialData?: {
    id: string
    title: string
    options: { id: string; text: string; votes: number }[]
  } | null
}

export function PollForm({ initialData }: PollFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PollInput>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      title: initialData?.title || '',
      options: initialData?.options.map((o) => o.text) || ['', ''],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'options' as never })

  const onSubmit = async (data: PollInput) => {
    setLoading(true)
    try {
      const url = initialData ? `/api/polls/${initialData.id}` : '/api/polls'
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/polls')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || 'Error al guardar la encuesta' })
      }
    } catch {
      showToast({ type: 'error', title: 'Error al guardar la encuesta' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="title" className="form-label">Pregunta de la Encuesta *</label>
        <input
          type="text"
          id="title"
          className="form-input"
          placeholder="Ej: ¿Qué género musical prefieres?"
          {...register('title')}
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div className="space-y-3">
        <label className="form-label">Opciones de Respuesta *</label>
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <input
              type="text"
              className="form-input flex-1"
              placeholder={`Opción ${index + 1}`}
              {...register(`options.${index}`)}
            />
            {fields.length > 2 && (
              <button type="button" onClick={() => remove(index)} className="p-2 text-red-400 hover:text-red-300">
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}
        {errors.options && <p className="text-sm text-red-600">{errors.options.message || errors.options.root?.message}</p>}
        <button
          type="button"
          onClick={() => append('')}
          className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
        >
          <PlusIcon className="h-4 w-4" /> Agregar opción
        </button>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? 'Guardando...' : initialData ? 'Actualizar Encuesta' : 'Crear Encuesta'}
        </button>
      </div>
    </form>
  )
}
