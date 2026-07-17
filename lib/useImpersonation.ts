'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getImpersonationData, ImpersonationPayload } from './impersonation'

export function useImpersonation() {
  const { data: session } = useSession()
  const [impersonationData, setImpersonationData] = useState<ImpersonationPayload | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [effectiveUser, setEffectiveUser] = useState(session?.user || null)

  useEffect(() => {
    const checkImpersonation = async () => {
      // Solo verificar impersonación si el usuario es admin
      if (session?.user?.role === 'ADMIN') {
        const impData = await getImpersonationData()
        if (impData) {
          setImpersonationData(impData)
          setIsImpersonating(true)
          
          // Crear un usuario efectivo basado en los datos de impersonación
          setEffectiveUser({
            id: impData.clientUserId,
            email: impData.clientEmail,
            name: impData.clientName,
            role: 'CLIENT'
          })
        } else {
          setIsImpersonating(false)
          setEffectiveUser(session.user)
        }
      } else {
        setIsImpersonating(false)
        setEffectiveUser(session?.user || null)
      }
    }

    if (session) {
      checkImpersonation()
    }
  }, [session])

  return {
    isImpersonating,
    impersonationData,
    effectiveUser, // Este es el usuario que debe usarse en la UI
    originalUser: session?.user || null // El usuario admin original
  }
}