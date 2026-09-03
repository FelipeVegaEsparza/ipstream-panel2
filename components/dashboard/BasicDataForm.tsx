'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { basicDataSchema, type BasicDataInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { GeocodeResult } from '@/lib/geocode'

interface BasicDataFormProps {
  initialData?: {
    projectName: string
    projectDescription: string
    logoUrl?: string | null
    coverUrl?: string | null
    radioStreamingUrl?: string | null
    videoStreamingUrl?: string | null
    location?: {
      city: string
      region?: string | null
      country: string
      latitude: number
      longitude: number
    } | null
  } | null
  clientId: string
}

export function BasicDataForm({ initialData, clientId }: BasicDataFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const [cityQuery, setCityQuery] = useState(initialData?.location?.city || '')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [cityOpen, setCityOpen] = useState(false)

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
      location: initialData?.location ?? null,
    },
  })

  const location = watch('location')

  useEffect(() => {
    if (cityQuery.trim().length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(cityQuery.trim())}`)
        if (!res.ok) {
          setSuggestions([])
          return
        }
        const data = await res.json()
        setSuggestions(Array.isArray(data.results) ? data.results : [])
      } catch (error) {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [cityQuery])

  const pickCity = (r: GeocodeResult) => {
    setValue(
      'location',
      {
        city: r.city,
        region: r.region,
        country: r.countryCode,
        latitude: r.latitude,
        longitude: r.longitude,
      },
      { shouldValidate: true }
    )
    setCityQuery(r.city)
    setCityOpen(false)
    setSuggestions([])
  }

  const clearCity = () => {
    setValue('location', null, { shouldValidate: true })
    setCityQuery('')
    setCityOpen(false)
    setSuggestions([])
  }

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
        showToast({ type: 'error', title: error.error || 'Error al guardar los datos' })
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Error al guardar los datos' })
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
        <label htmlFor="city" className="form-label">
          Ciudad de la Radio
        </label>
        <div className="relative">
          <input
            id="city"
            type="text"
            className="form-input"
            placeholder="Busca tu ciudad (ej: Osorno, Tokio...)"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value)
              setCityOpen(true)
            }}
            onFocus={() => setCityOpen(true)}
            onBlur={() => setTimeout(() => setCityOpen(false), 150)}
          />
          {cityOpen && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-xl max-h-60 overflow-auto">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-cyan-500/20"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      pickCity(s)
                    }}
                  >
                    {s.city}
                    {s.region ? `, ${s.region}` : ''} · {s.country}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {location && (
          <div className="flex items-center justify-between mt-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/40 rounded-md">
            <span className="text-sm text-cyan-300">
              {location.city}
              {location.region ? `, ${location.region}` : ''} · {location.country}
            </span>
            <button
              type="button"
              onClick={clearCity}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Quitar
            </button>
          </div>
        )}
        {errors.location && (
          <p className="text-sm text-red-600">{errors.location.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          El panel resuelve automáticamente la ubicación (ciudades de cualquier país). Los sitios podrán mostrar el clima con estas coordenadas.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="radioStreamingUrl" className="form-label">
          URL de Streaming de Radio
        </label>
        <input
          type="text"
          id="radioStreamingUrl"
          readOnly
          className="form-input bg-gray-800 text-cyan-400 font-mono text-sm cursor-not-allowed"
          value={initialData?.radioStreamingUrl || ''}
          placeholder="Se genera automáticamente según tu servidor"
        />
        <p className="text-xs text-gray-400 mt-1">
          Generada automáticamente según el servidor configurado. Copiala para usarla en tu sitio o player.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="videoStreamingUrl" className="form-label">
          URL de Streaming de Video
        </label>
        <input
          type="text"
          id="videoStreamingUrl"
          readOnly
          className="form-input bg-gray-800 text-cyan-400 font-mono text-sm cursor-not-allowed"
          value={initialData?.videoStreamingUrl || ''}
          placeholder="Se genera automáticamente según tu servidor"
        />
        <p className="text-xs text-gray-400 mt-1">
          Generada automáticamente según el servidor configurado. Copiala para usarla en tu sitio o player.
        </p>
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