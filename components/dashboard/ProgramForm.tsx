'use client'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { programSchema, type ProgramInput } from '@/lib/validations'
import { weekDayOptions } from '@/lib/utils'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface ProgramFormProps {
  initialData?: {
    id: string
    name: string
    imageUrl?: string | null
    description: string
    startTime: string
    endTime: string
    weekDays: string
  } | null
}

export function ProgramForm({ initialData }: ProgramFormProps) {
  const { t } = useDashboardI18n()
  const dayNames: Record<string, string> = {
    monday: t('tv.day.1'), tuesday: t('tv.day.2'), wednesday: t('tv.day.3'),
    thursday: t('tv.day.4'), friday: t('tv.day.5'), saturday: t('tv.day.6'), sunday: t('tv.day.0'),
  }
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProgramInput>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: initialData?.name || '',
      imageUrl: initialData?.imageUrl || '',
      description: initialData?.description || '',
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      weekDays: initialData ? JSON.parse(initialData.weekDays) : [],
    },
  })

  const selectedDays = watch('weekDays')

  const handleDayChange = (day: string, checked: boolean) => {
    const currentDays = selectedDays || []
    if (checked) {
      setValue('weekDays', [...currentDays, day])
    } else {
      setValue('weekDays', currentDays.filter(d => d !== day))
    }
  }

  const onSubmit = async (data: ProgramInput) => {
    setLoading(true)
    try {
      const url = initialData 
        ? `/api/programs/${initialData.id}` 
        : '/api/programs'
      
      const response = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/programs')
        router.refresh()
      } else {
        const error = await response.json()
        showToast({ type: 'error', title: error.error || t('programs.saveError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('programs.saveError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="form-group">
        <label htmlFor="name" className="form-label">
          {t('programs.name')}
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

      <ImageUpload
        label={t('programs.image')}
        description={t('programs.imageHint')}
        value={watch('imageUrl')}
        onChange={(url) => setValue('imageUrl', url)}
        onRemove={() => setValue('imageUrl', '')}
      />
      {errors.imageUrl && (
        <p className="text-sm text-red-600">{errors.imageUrl.message}</p>
      )}

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          {t('programs.description')}
        </label>
        <textarea
          id="description"
          rows={4}
          className="form-textarea"
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="startTime" className="form-label">
            {t('programs.startTime')}
          </label>
          <input
            type="time"
            id="startTime"
            className="form-input"
            {...register('startTime')}
          />
          {errors.startTime && (
            <p className="text-sm text-red-600">{errors.startTime.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="endTime" className="form-label">
            {t('programs.endTime')}
          </label>
          <input
            type="time"
            id="endTime"
            className="form-input"
            {...register('endTime')}
          />
          {errors.endTime && (
            <p className="text-sm text-red-600">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          {t('programs.weekdays')}
        </label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {weekDayOptions.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={selectedDays?.includes(option.value) || false}
                onChange={(e) => handleDayChange(option.value, e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">{dayNames[option.value] ?? option.label}</span>
            </label>
          ))}
        </div>
        {errors.weekDays && (
          <p className="text-sm text-red-600">{errors.weekDays.message}</p>
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