'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { promotionSchema, type PromotionInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface PromotionFormProps {
  initialData?: {
    id: string
    title: string
    description: string
    imageUrl?: string | null
    link?: string | null
  } | null
}

export function PromotionForm({ initialData }: PromotionFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PromotionInput>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      imageUrl: initialData?.imageUrl || '',
      link: initialData?.link || '',
    },
  })

  const watchImageUrl = watch('imageUrl')

  const onSubmit = async (data: PromotionInput) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/promotions/${initialData.id}` 
        : '/api/promotions'
      
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/promotions')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar la promoción')
      }
    } catch (error) {
      alert('Error al guardar la promoción')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Título de la Promoción *
        </label>
        <input
          type="text"
          id="title"
          className="form-input"
          placeholder="Ej: ¡Oferta especial del mes!"
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
          placeholder="Describe la promoción, términos y condiciones, fechas de vigencia..."
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <ImageUpload
        label="Imagen Promocional"
        description="Imagen que se mostrará en la promoción (recomendado: 400x200px)"
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />
      {errors.imageUrl && (
        <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
      )}

      <div className="form-group">
        <label htmlFor="link" className="form-label">
          Enlace de la Promoción
        </label>
        <input
          type="url"
          id="link"
          className="form-input"
          placeholder="https://ejemplo.com/promocion"
          {...register('link')}
        />
        <p className="text-xs text-gray-500 mt-1">
          Enlace donde los usuarios pueden acceder a la promoción (opcional).
        </p>
        {errors.link && (
          <p className="text-sm text-red-600">{errors.link.message}</p>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Consejos para promociones efectivas
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Usa títulos llamativos y claros</li>
                <li>Incluye fechas de vigencia en la descripción</li>
                <li>Agrega términos y condiciones si es necesario</li>
                <li>Usa imágenes atractivas y de buena calidad</li>
                <li>Incluye un enlace para más información o para participar</li>
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
          {loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear Promoción')}
        </button>
      </div>
    </form>
  )
}