'use client'

import { showToast } from '@/components/ui/toast'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newsSchema, type NewsInput } from '@/lib/validations'
import { generateSlug } from '@/lib/utils'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t } = useDashboardI18n()
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
        showToast({ type: 'error', title: error.error || t('news.form.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('news.form.saveError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          {t('news.form.name')}
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
          {t('news.form.slug')}
        </label>
        <input
          type="text"
          id="slug"
          className="form-input"
          placeholder={t('news.form.slugPlaceholder')}
          {...register('slug')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('news.form.slugHint')}
        </p>
        {errors.slug && (
          <p className="text-sm text-red-600">{errors.slug.message}</p>
        )}
      </div>

      <ImageUpload
        label={t('news.form.image')}
        description={t('news.form.imageHint')}
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />
      {errors.imageUrl && (
        <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
      )}

      <div className="form-group">
        <label htmlFor="shortText" className="form-label">
          {t('news.form.shortText')}
        </label>
        <textarea
          id="shortText"
          rows={3}
          className="form-textarea"
          placeholder={t('news.form.shortPlaceholder')}
          {...register('shortText')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('news.form.shortHint')}
        </p>
        {errors.shortText && (
          <p className="text-sm text-red-600">{errors.shortText.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="longText" className="form-label">
          {t('news.form.longText')}
        </label>
        <textarea
          id="longText"
          rows={12}
          className="form-textarea"
          placeholder={t('news.form.longPlaceholder')}
          {...register('longText')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('news.form.longHint')}
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
          {t('news.form.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? t('news.form.saving') : (initialData ? t('news.form.update') : t('news.form.create'))}
        </button>
      </div>
    </form>
  )
}