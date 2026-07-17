'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ImpersonationContextType {
  isImpersonating: boolean
  clientId: string | null
  clientData: {
    id: string
    name: string
    email: string
    projectName: string
  } | null
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  isImpersonating: false,
  clientId: null,
  clientData: null
})

export function useImpersonation() {
  return useContext(ImpersonationContext)
}

interface ImpersonationProviderProps {
  children: ReactNode
  fallbackClientId?: string | null
}

export function ImpersonationProvider({ children, fallbackClientId }: ImpersonationProviderProps) {
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientData, setClientData] = useState<any>(null)

  useEffect(() => {
    // Verificar si hay impersonación activa
    const checkImpersonation = () => {
      const impersonationToken = localStorage.getItem('impersonation_token')
      const clientInfo = localStorage.getItem('impersonation_client')
      
      if (impersonationToken && clientInfo) {
        try {
          const tokenData = JSON.parse(atob(impersonationToken))
          const parsedClientInfo = JSON.parse(clientInfo)
          
          // Verificar que el token no haya expirado
          if (Date.now() < tokenData.expires) {
            setIsImpersonating(true)
            setClientId(parsedClientInfo.id)
            setClientData(parsedClientInfo)
            return
          } else {
            // Token expirado, limpiar
            localStorage.removeItem('impersonation_token')
            localStorage.removeItem('impersonation_client')
          }
        } catch (error) {
          console.error('Error parsing impersonation data:', error)
          localStorage.removeItem('impersonation_token')
          localStorage.removeItem('impersonation_client')
        }
      }
      
      // Si no hay impersonación, usar el clientId de fallback
      setIsImpersonating(false)
      setClientId(fallbackClientId || null)
      setClientData(null)
    }

    checkImpersonation()
  }, [fallbackClientId])

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating,
      clientId,
      clientData
    }}>
      {children}
    </ImpersonationContext.Provider>
  )
}