'use client'

import { ArrowLeftIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { useImpersonationSession } from '@/lib/useImpersonationSession'
import { useEffect, useState } from 'react'
import { useDashboardI18n } from '@/components/providers/DashboardI18nProvider'

export function ImpersonationBanner() {
  const { t } = useDashboardI18n()
  const { isImpersonating, impersonationData, stopImpersonation, isLoading } = useImpersonationSession()
  const [mounted, setMounted] = useState(false)

  // Solo renderizar después de que el componente se monte en el cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // No renderizar nada hasta que esté montado (evita problemas de hidratación)
  if (!mounted || isLoading) {
    return null
  }

  const handleStopImpersonation = async () => {
    console.log('🎯 [Banner] Stop button clicked!')
    if (!confirm(t('impersonation.confirmStop'))) {
      console.log('🎯 [Banner] User cancelled')
      return
    }

    console.log('🎯 [Banner] Calling stopImpersonation...')
    await stopImpersonation()
  }

  // Solo mostrar el banner si hay impersonación activa
  if (!isImpersonating || !impersonationData) {
    console.log('🎯 [Banner] Not showing banner - isImpersonating:', isImpersonating, 'impersonationData:', !!impersonationData)
    return null
  }

  console.log('🎯 [Banner] Showing banner')

  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b border-amber-500/30 bg-[#241b0e] text-amber-100">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-3">
            <ShieldExclamationIcon className="h-5 w-5 text-amber-300" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span className="text-[13px] font-semibold">
                {t('impersonation.active')}
              </span>
              <span className="text-xs opacity-80">
                {t('impersonation.client')} <strong>{impersonationData.clientName}</strong> ({impersonationData.clientEmail})
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden text-xs opacity-70 sm:block">
              {t('impersonation.admin')} {impersonationData.adminEmail}
            </div>
            <button
              onClick={handleStopImpersonation}
              className="flex items-center space-x-1.5 rounded-control border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs transition-colors hover:bg-amber-500/20"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{t('impersonation.backToAdmin')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}