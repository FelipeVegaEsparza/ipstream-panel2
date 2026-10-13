import { cache } from 'react'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { verifyImpersonationToken, ImpersonationData } from '@/lib/impersonation'

export interface EffectiveClientData {
  clientId: string
  isImpersonating: boolean
  impersonationData?: ImpersonationData
}

type SessionUser = {
  id?: string
  role?: string
  clientId?: string | null
}

function isAuthorizedForImpersonation(
  user: SessionUser,
  data: ImpersonationData,
  originalUser?: { id?: string } | null
): boolean {
  return (
    user.role === 'ADMIN' ||
    user.id === data.adminId ||
    originalUser?.id === data.adminId
  )
}

async function resolveEffectiveClient(): Promise<EffectiveClientData | null> {
  const session = await getSession()

  if (!session?.user) {
    return null
  }

  const cookieStore = cookies()
  const impersonationToken = cookieStore.get('impersonation_token')?.value
  let effectiveClientId = session.user.clientId
  let isImpersonating = false
  let impersonationData: ImpersonationData | undefined

  if (impersonationToken) {
    const decoded = await verifyImpersonationToken(impersonationToken)
    if (
      decoded &&
      isAuthorizedForImpersonation(session.user, decoded, session.originalUser)
    ) {
      effectiveClientId = decoded.clientId
      isImpersonating = true
      impersonationData = decoded
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

// Memoiza por request (React cache): el cliente efectivo se resuelve una sola
// vez aunque la ruta (o el guard de menú) lo consulte varias veces.
export const getEffectiveClient = cache(resolveEffectiveClient)

export async function getEffectiveClientFromRequest(request: NextRequest): Promise<EffectiveClientData | null> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return null
    }

    let effectiveClientId = session.user.clientId
    let isImpersonating = false
    let impersonationData: ImpersonationData | undefined

    const impersonationToken = request.cookies.get('impersonation_token')?.value

    if (impersonationToken) {
      const decoded = await verifyImpersonationToken(impersonationToken)
      if (
        decoded &&
        isAuthorizedForImpersonation(session.user, decoded, session.originalUser)
      ) {
        effectiveClientId = decoded.clientId
        isImpersonating = true
        impersonationData = decoded
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
  } catch (error) {
    console.error('Error getting effective client from request:', error)
    return null
  }
}
