'use client'

import { useImpersonationSession } from '@/lib/useImpersonationSession'
import { ReactNode } from 'react'

interface DashboardWrapperProps {
  children: (clientId: string) => ReactNode
  fallback?: ReactNode
}

export function DashboardWrapper({ children, fallback }: DashboardWrapperProps) {
  const { effectiveUser, isImpersonating, isLoading } = useImpersonationSession()

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  if (!effectiveUser?.clientId) {
    return fallback || (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Error: No se encontró información del cliente
        </h3>
        <p className="text-gray-400 mb-4">
          No se pudo determinar el cliente para mostrar esta página
        </p>
        {isImpersonating ? (
          <button
            onClick={() => window.location.href = '/admin'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Volver al Admin
          </button>
        ) : (
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ir al Dashboard
          </button>
        )}
      </div>
    )
  }

  return <>{children(effectiveUser.clientId)}</>
}