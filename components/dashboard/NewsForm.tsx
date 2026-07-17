'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newsSchema, type NewsInput } from '@/lib/validations'
import { generateSlug } from '@/lib/utils'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface NewsFormProps {
  initialData?: {
    id: string
    name: string
    slug: string
    shortText: string
    longText: string
    imageUrl?: string | null
  } | null
}

export function NewsForm({ initialData }: NewsFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<NewsInput>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      name: initialData?.name || '',
      slug: initialData?.slug || '',
      shortText: initialData?.shortText || '',
      longText: initialData?.longText || '',
      imageUrl: initialData?.imageUrl || '',
    },
  })

  const watchName = watch('name')

  // Auto-generar slug cuando cambia el nombre
  useEffect(() => {
    if (watchName && !initialData) {
      const newSlug = generateSlug(watchName)
      setValue('slug', newSlug)
    }
  }, [watchName, setValue, initialData])

  const onSubmit = async (data: NewsInput) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/news/${initialData.id}` 
        : '/api/news'
      
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/news')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar la noticia')
      }
    } catch (error) {
      alert('Error al guardar la noticia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          Título de la Noticia *
        </label>
        <input
          type="text"
          id="name"
          className="form-input"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="slug" className="form-label">
          Slug (URL amigable) *
        </label>
        <input
          type="text"
          id="slug"
          className="form-input"
          placeholder="titulo-de-la-noticia"
          {...register('slug')}
        />
        <p className="text-xs text-gray-500 mt-1">
          Solo letras minúsculas, números y guiones. Se genera automáticamente desde el título.
        </p>
        {errors.slug && (
          <p className="text-sm text-red-600">{errors.slug.message}</p>
        )}
      </div>

      <ImageUpload
        label="Imagen de la Noticia"
        description="Imagen principal de la noticia (recomendado: 800x400px)"
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />
      {errors.imageUrl && (
        <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
      )}

      <div className="form-group">
        <label htmlFor="shortText" className="form-label">
          Texto Corto (Resumen) *
        </label>
        <textarea
          id="shortText"
          rows={3}
          className="form-textarea"
          placeholder="Breve resumen de la noticia que aparecerá en las listas..."
          {...register('shortText')}
        />
        <p className="text-xs text-gray-500 mt-1">
          Este texto aparecerá como resumen en las listas de noticias.
        </p>
        {errors.shortText && (
          <p className="text-sm text-red-600">{errors.shortText.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="longText" className="form-label">
          Contenido Completo *
        </label>
        <textarea
          id="longText"
          rows={12}
          className="form-textarea"
          placeholder="Escribe aquí el contenido completo de la noticia..."
          {...register('longText')}
        />
        <p className="text-xs text-gray-500 mt-1">
          Este es el contenido completo que se mostrará cuando se abra la noticia individual.
        </p>
        {errors.longText && (
          <p className="text-sm text-red-600">{errors.longText.message}</p>
        )}
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
          {loading ? 'Guardando...' : (initialData ? 'Actualizar' : 'Publicar')}
        </button>
      </div>
    </form>
  )
}