import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export interface EffectiveClientData {
  clientId: string
  isImpersonating: boolean
  impersonationData?: {
    adminId: string
    adminEmail: string
    clientId: string
    clientUserId: string
    clientEmail: string
    clientName: string
    timestamp: number
    expires: number
  }
}

export async function getEffectiveClient(): Promise<EffectiveClientData | null> {
  const session = await getServerSession(authOptions)
  const cookieStore = cookies()
  
  if (!session?.user) {
    return null
  }

  // Verificar si hay impersonación activa
  const impersonationToken = cookieStore.get('impersonation_token')?.value
  let effectiveClientId = session.user.clientId
  let isImpersonating = false
  let impersonationData = null

  if (impersonationToken && session.user.role === 'ADMIN') {
    try {
      const decoded = JSON.parse(Buffer.from(impersonationToken, 'base64').toString())
      if (Date.now() < decoded.expires) {
        effectiveClientId = decoded.clientId
        isImpersonating = true
        impersonationData = decoded
      }
    } catch (error) {
      console.error('Error decoding impersonation token:', error)
    }
  }
  
  if (!effectiveClientId) {
    return null
  }

  return {
    clientId: effectiveClientId,
    isImpersonating,
    impersonationData
  }
}

// Nueva función para obtener clientId desde request (para APIs)
export async function getEffectiveClientFromRequest(request: NextRequest): Promise<EffectiveClientData | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('🔍 No session found in request')
      return null
    }

    let effectiveClientId = session.user.clientId
    let isImpersonating = false
    let impersonationData = null

    // Si es admin, verificar impersonación desde headers (middleware)
    if (session.user.role === 'ADMIN') {
      const impersonationClientId = request.headers.get('x-impersonation-client-id')
      const impersonationActive = request.headers.get('x-impersonation-active')
      
      if (impersonationActive === 'true' && impersonationClientId) {
        effectiveClientId = impersonationClientId
        isImpersonating = true
        
        // Obtener datos adicionales de impersonación si están disponibles
        const adminId = request.headers.get('x-impersonation-admin-id')
        const clientEmail = request.headers.get('x-impersonation-client-email')
        
        impersonationData = {
          adminId: adminId || session.user.id,
          adminEmail: session.user.email || '',
          clientId: impersonationClientId,
          clientUserId: '',
          clientEmail: clientEmail || '',
          clientName: '',
          timestamp: Date.now(),
          expires: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        }
        
        console.log('🎭 Using impersonation:', { 
          adminId: session.user.id, 
          clientId: effectiveClientId 
        })
      }
    }

    if (!effectiveClientId) {
      console.log('🔍 No effective clientId found')
      return null
    }

    console.log('✅ Effective client:', { 
      clientId: effectiveClientId, 
      isImpersonating,
      userRole: session.user.role 
    })

    return {
      clientId: effectiveClientId,
      isImpersonating,
      impersonationData
    }
  } catch (error) {
    console.error('❌ Error getting effective client from request:', error)
    return null
  }
}