'use client'

import { useEffect, useState } from 'react'
import { DashboardWrapper } from './DashboardWrapper'
import { BasicDataForm } from './BasicDataForm'

interface BasicData {
  id: string
  clientId: string
  projectName: string
  projectDescription: string
  logoUrl?: string | null
  coverUrl?: string | null
  radioStreamingUrl?: string | null
  videoStreamingUrl?: string | null
}

export function BasicDataClient() {
  return (
    <DashboardWrapper>
      {(clientId) => <BasicDataContent clientId={clientId} />}
    </DashboardWrapper>
  )
}

function BasicDataContent({ clientId }: { clientId: string }) {
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
          setError('Error al cargar datos básicos')
        }
      } catch (error) {
        console.error('Error fetching basic data:', error)
        setError('Error al cargar datos básicos')
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando datos básicos...</p>
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
        <h1 className="text-2xl font-bold text-white">
          Datos Básicos del Proyecto
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Configura la información básica de tu proyecto de radio
        </p>
      </div>

      <div className="card max-w-2xl">
        <BasicDataForm initialData={basicData} clientId={clientId} />
      </div>
    </div>
  )
}