'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { promotionSchema, type PromotionInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

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
  const { t } = useDashboardI18n()
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
        showToast({ type: 'error', title: error.error || t('promotions.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('promotions.saveError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          {t('promotions.titleLabel')}
        </label>
        <input
          type="text"
          id="title"
          className="form-input"
          placeholder={t('promotions.formTitlePlaceholder')}
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          {t('promotions.description')}
        </label>
        <textarea
          id="description"
          rows={4}
          className="form-textarea"
          placeholder={t('promotions.descriptionPlaceholder')}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <ImageUpload
        label={t('promotions.image')}
        description={t('promotions.imageHint')}
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />
      {errors.imageUrl && (
        <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
      )}

      <div className="form-group">
        <label htmlFor="link" className="form-label">
          {t('promotions.linkLabel')}
        </label>
        <input
          type="url"
          id="link"
          className="form-input"
          placeholder={t('promotions.linkPlaceholder')}
          {...register('link')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('promotions.linkHint')}
        </p>
        {errors.link && (
          <p className="text-sm text-red-600">{errors.link.message}</p>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              {t('promotions.tipsActual')}
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>{t('promotions.tip1')}</li>
                <li>{t('promotions.tip2')}</li>
                <li>{t('promotions.tip3')}</li>
                <li>{t('promotions.tip4')}</li>
                <li>{t('promotions.tip5')}</li>
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
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? t('common.saving') : (initialData ? t('promotions.update') : t('promotions.create'))}
        </button>
      </div>
    </form>
  )
}