'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { basicDataSchema, type BasicDataInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface BasicDataFormProps {
  initialData?: {
    projectName: string
    projectDescription: string
    logoUrl?: string | null
    coverUrl?: string | null
    radioStreamingUrl?: string | null
    videoStreamingUrl?: string | null
  } | null
  clientId: string
}

export function BasicDataForm({ initialData, clientId }: BasicDataFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BasicDataInput>({
    resolver: zodResolver(basicDataSchema),
    defaultValues: {
      projectName: initialData?.projectName || '',
      projectDescription: initialData?.projectDescription || '',
      logoUrl: initialData?.logoUrl || '',
      coverUrl: initialData?.coverUrl || '',
      radioStreamingUrl: initialData?.radioStreamingUrl || '',
      videoStreamingUrl: initialData?.videoStreamingUrl || '',
    },
  })

  const onSubmit = async (data: BasicDataInput) => {
    setLoading(true)
    try {
      const response = await fetch('/api/basic-data', {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar los datos')
      }
    } catch (error) {
      alert('Error al guardar los datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="projectName" className="form-label">
          Nombre del Proyecto *
        </label>
        <input
          type="text"
          id="projectName"
          className="form-input"
          {...register('projectName')}
        />
        {errors.projectName && (
          <p className="text-sm text-red-600">{errors.projectName.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="projectDescription" className="form-label">
          Descripción del Proyecto *
        </label>
        <textarea
          id="projectDescription"
          rows={4}
          className="form-textarea"
          {...register('projectDescription')}
        />
        {errors.projectDescription && (
          <p className="text-sm text-red-600">{errors.projectDescription.message}</p>
        )}
      </div>

      <ImageUpload
        label="Logo del Proyecto"
        description="Logo de tu radio (recomendado: 200x100px)"
        value={watch('logoUrl')}
        onChange={(url) => setValue('logoUrl', url)}
        onRemove={() => setValue('logoUrl', '')}
      />
      {errors.logoUrl && (
        <p className="text-sm text-red-600">{errors.logoUrl.message}</p>
      )}

      <ImageUpload
        label="Cover del Proyecto"
        description="Imagen de portada (recomendado: 800x400px)"
        value={watch('coverUrl')}
        onChange={(url) => setValue('coverUrl', url)}
        onRemove={() => setValue('coverUrl', '')}
      />
      {errors.coverUrl && (
        <p className="text-sm text-red-600">{errors.coverUrl.message}</p>
      )}

      <div className="form-group">
        <label htmlFor="radioStreamingUrl" className="form-label">
          URL de Streaming de Radio
        </label>
        <input
          type="url"
          id="radioStreamingUrl"
          className="form-input"
          placeholder="https://streaming.ejemplo.com/radio"
          {...register('radioStreamingUrl')}
        />
        {errors.radioStreamingUrl && (
          <p className="text-sm text-red-600">{errors.radioStreamingUrl.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="videoStreamingUrl" className="form-label">
          URL de Streaming de Video
        </label>
        <input
          type="url"
          id="videoStreamingUrl"
          className="form-input"
          placeholder="https://streaming.ejemplo.com/video"
          {...register('videoStreamingUrl')}
        />
        {errors.videoStreamingUrl && (
          <p className="text-sm text-red-600">{errors.videoStreamingUrl.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3">
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
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}