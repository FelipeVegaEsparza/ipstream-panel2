'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface ImpersonationData {
  adminId: string
  adminEmail: string
  clientId: string
  clientUserId: string
  clientEmail: string
  clientName: string
  timestamp: number
  expires: number
}

export function useImpersonationSession() {
  const { data: session, status, update } = useSession()
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        // console.log('🔍 Checking impersonation status...')
        // Verificar si hay una cookie de impersonación
        const response = await fetch('/api/auth/impersonation-status')
        // console.log('📡 Impersonation status response:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          // console.log('📊 Impersonation data:', data)
          // console.log('🔍 isImpersonating:', data.isImpersonating)
          // console.log('🔍 impersonationData:', data.impersonationData)
          
          if (data.isImpersonating && data.impersonationData) {
            // console.log('✅ Impersonation detected, setting data')
            setImpersonationData(data.impersonationData)
            
            // Actualizar la sesión de NextAuth si no está ya actualizada
            if (session && !session.impersonation) {
              console.log('🔄 Updating session with impersonation data')
              await update({
                impersonation: {
                  clientId: data.impersonationData.clientId,
                  clientEmail: data.impersonationData.clientEmail,
                  clientName: data.impersonationData.clientName,
                  adminId: data.impersonationData.adminId,
                  adminEmail: data.impersonationData.adminEmail
                }
              })
            }
          } else {
            console.log('❌ No impersonation detected')
            setImpersonationData(null)
            
            // Si la sesión tiene impersonación pero no hay cookie, limpiar sesión
            if (session?.impersonation) {
              await update({ impersonation: null })
            }
          }
        }
      } catch (error) {
        console.error('Error checking impersonation status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      checkImpersonation()
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [session, status, update])

  const stopImpersonation = async () => {
    try {
      console.log('🛑 Stopping impersonation...')
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE'
      })

      console.log('📡 Stop impersonation response:', response.status)

      if (response.ok) {
        console.log('✅ Impersonation stopped successfully')
        // Limpiar estado local
        setImpersonationData(null)
        
        // Actualizar sesión para remover impersonación
        console.log('🔄 Updating session to remove impersonation')
        await update({ impersonation: null })
        
        // Redirigir al panel de admin con recarga completa
        console.log('🔄 Redirecting to admin panel...')
        window.location.replace('/admin')
      } else {
        console.error('❌ Failed to stop impersonation:', response.status)
      }
    } catch (error) {
      console.error('Error stopping impersonation:', error)
    }
  }

  return {
    session,
    isImpersonating: !!impersonationData,
    impersonationData,
    effectiveUser: session?.impersonation ? {
      id: impersonationData?.clientUserId || '',
      email: impersonationData?.clientEmail || '',
      name: impersonationData?.clientName || '',
      role: 'CLIENT',
      clientId: impersonationData?.clientId || null
    } : session?.user,
    originalUser: session?.impersonation ? session.originalUser : null,
    stopImpersonation,
    isLoading: isLoading || status === 'loading'
  }
}