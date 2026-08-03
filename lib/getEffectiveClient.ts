import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
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

export async function getEffectiveClient(): Promise<EffectiveClientData | null> {
  const session = await getServerSession(authOptions)

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

export async function getEffectiveClientFromRequest(request: NextRequest): Promise<EffectiveClientData | null> {
  try {
    const session = await getServerSession(authOptions)

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
