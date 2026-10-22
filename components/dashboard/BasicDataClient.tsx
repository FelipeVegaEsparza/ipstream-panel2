'use client'

import { useEffect, useState } from 'react'
import { DashboardWrapper } from './DashboardWrapper'
import { BasicDataForm } from './BasicDataForm'
import TimezoneSelector from './streaming/TimezoneSelector'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface BasicData {
  id: string
  clientId: string
  projectName: string
  projectDescription: string
  logoUrl?: string | null
  coverUrl?: string | null
  splashBackgroundUrl?: string | null
  radioStreamingUrl?: string | null
  videoStreamingUrl?: string | null
  location?: {
    city: string
    region?: string | null
    country: string
    latitude: number
    longitude: number
  } | null
}

export function BasicDataClient() {
  return (
    <DashboardWrapper>
      {(clientId) => <BasicDataContent clientId={clientId} />}
    </DashboardWrapper>
  )
}

function BasicDataContent({ clientId }: { clientId: string }) {
  const { t } = useDashboardI18n()
  const [basicData, setBasicData] = useState<BasicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBasicData = async () => {
      try {
        const response = await fetch(`/api/dashboard/basic-data?clientId=${clientId}`)
        
        if (response.ok) {
          const data = await response.json()
          setBasicData(data.basicData)
        } else if (response.status === 404) {
          // No hay datos básicos aún, esto es normal
          setBasicData(null)
        } else {
          setError(t('basic.loadError'))
        }
      } catch (error) {
        console.error('Error fetching basic data:', error)
        setError(t('basic.loadError'))
      } finally {
        setLoading(false)
      }
    }

    fetchBasicData()
  }, [clientId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('basic.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('basic.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('basic.subtitle')}
        </p>
      </div>

      <div className="card max-w-2xl">
        <BasicDataForm initialData={basicData} clientId={clientId} />
      </div>

      <div className="card max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-1">{t('basic.timezone')}</h2>
        <p className="text-sm text-muted-foreground mb-3">
          {t('basic.timezoneHint')}
        </p>
        <TimezoneSelector />
      </div>
    </div>
  )
}