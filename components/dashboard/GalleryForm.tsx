'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { gallerySchema, type GalleryInput } from '@/lib/validations'
import { GalleryImageUpload } from './GalleryImageUpload'

interface GalleryFormProps {
  initialData?: {
    id: string
    title: string
    description: string
    images: { imageUrl: string }[]
  } | null
}

export function GalleryForm({ initialData }: GalleryFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GalleryInput>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      imageUrls: initialData?.images.map((img) => img.imageUrl) || [],
    },
  })

  const watchImageUrls = watch('imageUrls')

  const onSubmit = async (data: GalleryInput) => {
    setLoading(true)
    try {
      const url = initialData
        ? `/api/galleries/${initialData.id}`
        : '/api/galleries'

      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/galleries')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || 'Error al guardar la galería' })
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error al guardar la galería' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Título de la Galería *
        </label>
        <input
          type="text"
          id="title"
          className="form-input"
          placeholder="Ej: Fiesta de la Radio 2025"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Descripción *
        </label>
        <textarea
          id="description"
          rows={4}
          className="form-textarea"
          placeholder="Describe de qué trata esta galería de imágenes..."
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <GalleryImageUpload
        images={watchImageUrls}
        onChange={(urls) => setValue('imageUrls', urls, { shouldValidate: true })}
      />
      {errors.imageUrls && (
        <p className="text-sm text-red-600">{errors.imageUrls.message}</p>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Consejos para tu galería
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Usa imágenes de buena calidad y resolución</li>
                <li>Puedes subir varias imágenes a la vez</li>
                <li>Reordena las imágenes con los botones &larr; &rarr;</li>
                <li>Las imágenes se optimizarán automáticamente</li>
                <li>Tamaño máximo por imagen: 5MB</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading
            ? 'Guardando...'
            : initialData
              ? 'Actualizar Galería'
              : 'Crear Galería'}
        </button>
      </div>
    </form>
  )
}
