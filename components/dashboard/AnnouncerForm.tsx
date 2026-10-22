'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { announcerSchema, type AnnouncerInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface AnnouncerFormProps {
  initialData?: {
    id: string
    name: string
    description: string
    imageUrl?: string | null
  } | null
}

export function AnnouncerForm({ initialData }: AnnouncerFormProps) {
  const { t } = useDashboardI18n()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AnnouncerInput>({
    resolver: zodResolver(announcerSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      imageUrl: initialData?.imageUrl || '',
    },
  })

  const onSubmit = async (data: AnnouncerInput) => {
    setLoading(true)
    try {
      const url = initialData ? `/api/announcers/${initialData.id}` : '/api/announcers'
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/announcers')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('announcers.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('announcers.saveError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">{t('announcers.name')}</label>
        <input
          type="text"
          id="name"
          className="form-input"
          placeholder={t('announcers.namePlaceholder')}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">{t('announcers.description')}</label>
        <textarea
          id="description"
          rows={4}
          className="form-textarea"
          placeholder={t('announcers.descriptionPlaceholder')}
          {...register('description')}
        />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <ImageUpload
        label={t('announcers.photo')}
        description={t('announcers.photoHint')}
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />
      {errors.imageUrl && <p className="text-sm text-red-600">{errors.imageUrl.message}</p>}

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button type="button" onClick={() => router.back()} className="btn-secondary">{t('common.cancel')}</button>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
          {loading ? t('common.saving') : initialData ? t('announcers.update') : t('announcers.create')}
        </button>
      </div>
    </form>
  )
}
