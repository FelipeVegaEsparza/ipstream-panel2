'use client'

import { ArrowLeftIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { useImpersonationSession } from '@/lib/useImpersonationSession'
import { useEffect, useState } from 'react'

export function ImpersonationBanner() {
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
    if (!confirm('¿Estás seguro de que quieres volver a tu sesión de administrador?')) {
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
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <ShieldExclamationIcon className="h-6 w-6 text-white" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              <span className="font-semibold">
                Modo Impersonación Activo
              </span>
              <span className="text-sm opacity-90">
                Cliente: <strong>{impersonationData.clientName}</strong> ({impersonationData.clientEmail})
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-sm opacity-90">
              Admin: {impersonationData.adminEmail}
            </div>
            <button
              onClick={handleStopImpersonation}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Volver al Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}