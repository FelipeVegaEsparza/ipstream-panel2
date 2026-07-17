'use client'

import { useState, useEffect } from 'react'
import { isImpersonating, getImpersonationToken, verifyImpersonationToken, returnToAdmin, type ImpersonationData } from '@/lib/impersonation'

export function ImpersonationBanner() {
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkImpersonation = async () => {
      if (isImpersonating()) {
        const token = getImpersonationToken()
        if (token) {
          const data = await verifyImpersonationToken(token)
          if (data) {
            setImpersonationData(data)
            setIsVisible(true)
          }
        }
      }
    }

    checkImpersonation()

    // Escuchar mensajes de la ventana padre (admin)
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      
      if (event.data.type === 'IMPERSONATE_TOKEN') {
        const data = await verifyImpersonationToken(event.data.token)
        if (data) {
          setImpersonationData(data)
          setIsVisible(true)
          // Guardar token en sessionStorage
          sessionStorage.setItem('impersonation_token', event.data.token)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!isVisible || !impersonationData) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="font-semibold">MODO IMPERSONACIÓN ACTIVO</span>
            </div>
            <div className="hidden md:block text-sm">
              Administrador: <span className="font-medium">{impersonationData.adminEmail}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm">
              Impersonando desde: {new Date(impersonationData.impersonatedAt).toLocaleTimeString('es-ES')}
            </div>
            <button
              onClick={returnToAdmin}
              className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver a Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}