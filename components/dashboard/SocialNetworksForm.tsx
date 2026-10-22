'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { socialNetworksSchema, type SocialNetworksInput } from '@/lib/validations'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface SocialNetworksFormProps {
    initialData?: {
        facebook?: string | null
        youtube?: string | null
        instagram?: string | null
        tiktok?: string | null
        whatsapp?: string | null
        x?: string | null
    } | null
}

export function SocialNetworksForm({ initialData }: SocialNetworksFormProps) {
    const { t } = useDashboardI18n()
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SocialNetworksInput>({
        resolver: zodResolver(socialNetworksSchema),
        defaultValues: {
            facebook: initialData?.facebook || '',
            youtube: initialData?.youtube || '',
            instagram: initialData?.instagram || '',
            tiktok: initialData?.tiktok || '',
            whatsapp: initialData?.whatsapp || '',
            x: initialData?.x || '',
        },
    })

    const onSubmit = async (data: SocialNetworksInput) => {
        setLoading(true)
        try {
            const response = await fetch('/api/social-networks', {
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
                showToast({ type: 'error', title: error.error || t('social.saveError') })
            }
        } catch (error) {
            showToast({ type: 'error', title: t('social.saveError') })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="form-group">
                <label htmlFor="facebook" className="form-label">
                    {t('social.facebook')}
                </label>
                <input
                    type="url"
                    id="facebook"
                    className="form-input"
                    placeholder={t('social.facebookPlaceholder')}
                    {...register('facebook')}
                />
                {errors.facebook && (
                    <p className="text-sm text-red-600">{errors.facebook.message}</p>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="youtube" className="form-label">
                    {t('social.youtube')}
                </label>
                <input
                    type="url"
                    id="youtube"
                    className="form-input"
                    placeholder={t('social.youtubePlaceholder')}
                    {...register('youtube')}
                />
                {errors.youtube && (
                    <p className="text-sm text-red-600">{errors.youtube.message}</p>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="instagram" className="form-label">
                    {t('social.instagram')}
                </label>
                <input
                    type="url"
                    id="instagram"
                    className="form-input"
                    placeholder={t('social.instagramPlaceholder')}
                    {...register('instagram')}
                />
                {errors.instagram && (
                    <p className="text-sm text-red-600">{errors.instagram.message}</p>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="tiktok" className="form-label">
                    {t('social.tiktok')}
                </label>
                <input
                    type="url"
                    id="tiktok"
                    className="form-input"
                    placeholder={t('social.tiktokPlaceholder')}
                    {...register('tiktok')}
                />
                {errors.tiktok && (
                    <p className="text-sm text-red-600">{errors.tiktok.message}</p>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="whatsapp" className="form-label">
                    {t('social.whatsapp')}
                </label>
                <input
                    type="text"
                    id="whatsapp"
                    className="form-input"
                    placeholder={t('social.whatsappPlaceholder')}
                    {...register('whatsapp')}
                />
                {errors.whatsapp && (
                    <p className="text-sm text-red-600">{errors.whatsapp.message}</p>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="x" className="form-label">
                    {t('social.x')}
                </label>
                <input
                    type="url"
                    id="x"
                    className="form-input"
                    placeholder={t('social.xPlaceholder')}
                    {...register('x')}
                />
                {errors.x && (
                    <p className="text-sm text-red-600">{errors.x.message}</p>
                )}
            </div>

            <div className="flex justify-end space-x-3">
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
                    {loading ? t('common.saving') : t('common.save')}
                </button>
            </div>
        </form>
    )
}