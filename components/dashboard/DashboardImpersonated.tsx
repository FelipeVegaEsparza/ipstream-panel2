'use client'

import { useEffect, useState } from 'react'
import { DashboardStats } from './DashboardStats'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

interface ClientData {
  id: string
  name: string
  email: string
  projectName: string
}

export function DashboardImpersonated() {
  const { t } = useDashboardI18n()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClientData = () => {
      try {
        // Obtener información del cliente del localStorage
        const clientInfo = localStorage.getItem('impersonation_client')
        
        if (!clientInfo) {
          setError(t('impersonated.loadError'))
          setLoading(false)
          return
        }

        const parsedClientInfo = JSON.parse(clientInfo)
        
        setClientData({
          id: parsedClientInfo.id,
          name: parsedClientInfo.name,
          email: parsedClientInfo.email,
          projectName: parsedClientInfo.projectName || parsedClientInfo.name
        })
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading client data:', error)
        setError(t('impersonated.loadFailed'))
        setLoading(false)
      }
    }

    loadClientData()
  }, [t])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('impersonated.loading')}
          </h3>
          <p className="text-muted-foreground">
            {t('impersonated.settingUp')}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('impersonated.error')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.href = '/admin'}
            className="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t('wrapper.backAdmin')}
          </button>
        </div>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('impersonated.notFound')}
          </h3>
          <p className="text-muted-foreground">
            {t('impersonated.notFoundHint')}
          </p>
        </div>
      </div>
    )
  }

  // Datos de ejemplo para mostrar el dashboard funcionando
  const stats = [
    {
      name: t('impersonated.statPrograms'),
      value: 0,
      href: '/dashboard/programs',
      color: 'bg-brand'
    },
    {
      name: t('impersonated.statNews'),
      value: 0,
      href: '/dashboard/news',
      color: 'bg-green-500'
    },
    {
      name: t('impersonated.statVideos'),
      value: 0,
      href: '/dashboard/videos',
      color: 'bg-purple-500'
    },
    {
      name: t('impersonated.statSponsors'),
      value: 0,
      href: '/dashboard/sponsors',
      color: 'bg-yellow-500'
    },
    {
      name: t('impersonated.statPromotions'),
      value: 0,
      href: '/dashboard/promotions',
      color: 'bg-red-500'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Dashboard - {clientData.projectName}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('impersonated.asClient', { email: clientData.email })}
        </p>
        <div className="glass-effect rounded-xl p-4 mb-6">
          <p className="text-sm text-brand">
            <strong>Client ID:</strong> <code className="bg-secondary/50 px-3 py-1 rounded-lg text-xs font-mono text-brand ml-2">{clientData.id}</code>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t('impersonated.activeHint')}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500/20 to-brand/20 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-300 mb-2">
              {t('impersonated.success')}
            </h3>
            <p className="text-sm text-green-200/80 mb-4">
              {t('impersonated.successHint', { name: clientData.name })}
            </p>
            <div className="flex gap-3">
              <a
                href="/dashboard/basic-data"
                className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('impersonated.viewBasic')}
              </a>
              <a
                href="/dashboard/programs"
                className="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t('impersonated.viewPrograms')}
              </a>
            </div>
          </div>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
            <svg className="w-5 h-5 text-brand mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('impersonated.quickActions')}
          </h3>
          <div className="space-y-3">
            <a
              href="/dashboard/programs/new"
              className="block p-4 border border-border rounded-xl hover:bg-secondary/50 hover:border-brand/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">{t('impersonated.addProgram')}</div>
                  <div className="text-sm text-muted-foreground">{t('impersonated.addProgramHint')}</div>
                </div>
              </div>
            </a>
            <a
              href="/dashboard/news/new"
              className="block p-4 border border-border rounded-xl hover:bg-secondary/50 hover:border-brand/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">{t('impersonated.publishNews')}</div>
                  <div className="text-sm text-muted-foreground">{t('impersonated.publishNewsHint')}</div>
                </div>
              </div>
            </a>
            <a
              href="/dashboard/videos/new"
              className="block p-4 border border-border rounded-xl hover:bg-secondary/50 hover:border-brand/50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">{t('impersonated.addVideo')}</div>
                  <div className="text-sm text-muted-foreground">{t('impersonated.addVideoHint')}</div>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-foreground mb-6 flex items-center">
            <svg className="w-5 h-5 text-brand mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('impersonated.clientInfo')}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t('impersonated.clientName')}</span>
              <span className="text-sm font-medium text-foreground">
                {clientData.name}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">
                {clientData.email}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
              <span className="text-sm text-muted-foreground">{t('impersonated.project')}</span>
              <span className="text-sm font-medium text-foreground">
                {clientData.projectName}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-500/20 rounded-lg border border-green-500/30">
              <span className="text-sm text-green-300">{t('impersonated.status')}</span>
              <span className="text-sm font-medium text-green-400">
                {t('impersonated.active')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}