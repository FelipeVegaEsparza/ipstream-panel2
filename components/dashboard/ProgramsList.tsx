'use client'

import { useRouter } from 'next/navigation'

import { showToast } from '@/components/ui/toast'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatTime } from '@/lib/utils'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Program {
  id: string
  name: string
  imageUrl?: string | null
  description: string
  startTime: string
  endTime: string
  weekDays: string
}

interface ProgramsListProps {
  programs: Program[]
}

export function ProgramsList({ programs }: ProgramsListProps) {
  const { t } = useDashboardI18n()
  const dayNames: Record<string, string> = {
    monday: t('tv.day.1'), tuesday: t('tv.day.2'), wednesday: t('tv.day.3'),
    thursday: t('tv.day.4'), friday: t('tv.day.5'), saturday: t('tv.day.6'), sunday: t('tv.day.0'),
  }
  const formatDays = (days: string[]) => days.map((day) => dayNames[day] ?? day).join(', ')
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm(t('programs.confirmDelete'))) {
      return
    }

    setLoading(id)
    try {
      const response = await fetch(`/api/programs/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      } else {
        showToast({ type: 'error', title: t('programs.deleteError') })
      }
    } catch (error) {
      showToast({ type: 'error', title: t('programs.deleteError') })
    } finally {
      setLoading(null)
    }
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t('programs.empty')}
        </h3>
        <p className="text-muted-foreground mb-4">
          {t('programs.emptyHint')}
        </p>
        <Link href="/dashboard/programs/new" className="btn-primary">
          {t('programs.create')}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((program) => {
        const weekDays = JSON.parse(program.weekDays)
        
        return (
          <div key={program.id} className="card">
            {program.imageUrl && (
              <div className="mb-4">
                <Image
                  src={program.imageUrl}
                  alt={program.name}
                  width={300}
                  height={200}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
            
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-foreground">
                {program.name}
              </h3>
              
              <p className="text-muted-foreground text-sm line-clamp-3">
                {program.description}
              </p>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center">
                  <span className="font-semibold text-brand mr-2">{t('programs.schedule')}</span>
                  <span>{formatTime(program.startTime)} - {formatTime(program.endTime)}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-brand mr-2">{t('programs.days')}</span>
                  <span>{formatDays(weekDays)}</span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Link
                  href={`/dashboard/programs/${program.id}/edit`}
                  className="action-button action-button-edit"
                  title={t('programs.edit')}
                >
                  <PencilIcon className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(program.id)}
                  disabled={loading === program.id}
                  className="action-button action-button-delete"
                  title={t('programs.delete')}
                >
                  {loading === program.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}