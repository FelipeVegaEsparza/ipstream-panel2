'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { sponsorSchema, type SponsorInput } from '@/lib/validations'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface SponsorFormProps {
  initialData?: {
    id: string
    name: string
    logoUrl?: string | null
    address?: string | null
    description: string
    facebook?: string | null
    youtube?: string | null
    instagram?: string | null
    tiktok?: string | null
    whatsapp?: string | null
    x?: string | null
    website?: string | null
  } | null
}

export function SponsorForm({ initialData }: SponsorFormProps) {
  const { t } = useDashboardI18n()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SponsorInput>({
    resolver: zodResolver(sponsorSchema),
    defaultValues: {
      name: initialData?.name || '',
      logoUrl: initialData?.logoUrl || '',
      address: initialData?.address || '',
      description: initialData?.description || '',
      facebook: initialData?.facebook || '',
      youtube: initialData?.youtube || '',
      instagram: initialData?.instagram || '',
      tiktok: initialData?.tiktok || '',
      whatsapp: initialData?.whatsapp || '',
      x: initialData?.x || '',
      website: initialData?.website || '',
    },
  })

  const watchLogoUrl = watch('logoUrl')

  const onSubmit = async (data: SponsorInput) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/sponsors/${initialData.id}` 
        : '/api/sponsors'
      
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/sponsors')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('sponsors.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('sponsors.saveError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Información Básica */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('sponsors.basicInfo')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              {t('sponsors.name')}
            </label>
            <input
              type="text"
              id="name"
              className="form-input"
              placeholder={t('sponsors.namePlaceholder')}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address" className="form-label">
              {t('sponsors.address')}
            </label>
            <input
              type="text"
              id="address"
              className="form-input"
              placeholder={t('sponsors.addressPlaceholder')}
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>
        </div>

        <ImageUpload
          label={t('sponsors.logo')}
          description={t('sponsors.logoHint')}
          value={watch('logoUrl')}
          onChange={(url) => setValue('logoUrl', url)}
          onRemove={() => setValue('logoUrl', '')}
        />
        {errors.logoUrl && (
          <p className="text-sm text-red-600">{errors.logoUrl.message}</p>
        )}

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            {t('sponsors.description')}
          </label>
          <textarea
            id="description"
            rows={4}
            className="form-textarea"
            placeholder={t('sponsors.descriptionPlaceholder')}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* Sitio Web */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('sponsors.website')}
        </h3>

        <div className="form-group">
          <label htmlFor="website" className="form-label">
            {t('sponsors.website')}
          </label>
          <input
            type="url"
            id="website"
            className="form-input"
            placeholder={t('sponsors.websitePlaceholder')}
            {...register('website')}
          />
          {errors.website && (
            <p className="text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>
      </div>

      {/* Redes Sociales */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
          {t('sponsors.social')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="facebook" className="form-label">
              Facebook
            </label>
            <input
              type="url"
              id="facebook"
              className="form-input"
              placeholder="https://facebook.com/empresa"
              {...register('facebook')}
            />
            {errors.facebook && (
              <p className="text-sm text-red-600">{errors.facebook.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="instagram" className="form-label">
              Instagram
            </label>
            <input
              type="url"
              id="instagram"
              className="form-input"
              placeholder="https://instagram.com/empresa"
              {...register('instagram')}
            />
            {errors.instagram && (
              <p className="text-sm text-red-600">{errors.instagram.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="youtube" className="form-label">
              YouTube
            </label>
            <input
              type="url"
              id="youtube"
              className="form-input"
              placeholder="https://youtube.com/@empresa"
              {...register('youtube')}
            />
            {errors.youtube && (
              <p className="text-sm text-red-600">{errors.youtube.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="tiktok" className="form-label">
              TikTok
            </label>
            <input
              type="url"
              id="tiktok"
              className="form-input"
              placeholder="https://tiktok.com/@empresa"
              {...register('tiktok')}
            />
            {errors.tiktok && (
              <p className="text-sm text-red-600">{errors.tiktok.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="x" className="form-label">
              X (Twitter)
            </label>
            <input
              type="url"
              id="x"
              className="form-input"
              placeholder="https://x.com/empresa"
              {...register('x')}
            />
            {errors.x && (
              <p className="text-sm text-red-600">{errors.x.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp" className="form-label">
              WhatsApp
            </label>
            <input
              type="text"
              id="whatsapp"
              className="form-input"
              placeholder="+56912345678 o https://wa.me/56912345678"
              {...register('whatsapp')}
            />
            {errors.whatsapp && (
              <p className="text-sm text-red-600">{errors.whatsapp.message}</p>
            )}
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
          {loading ? t('common.saving') : (initialData ? t('sponsors.update') : t('sponsors.create'))}
        </button>
      </div>
    </form>
  )
}