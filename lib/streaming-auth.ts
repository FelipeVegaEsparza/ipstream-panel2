// =====================================================
// Streaming helper — resuelve y autoriza el RadioStream
// =====================================================

import { prisma } from '@/lib/prisma'
import { getEffectiveClient } from '@/lib/getEffectiveClient'

export interface StreamingContext {
  clientId: string
  userId: string
  userRole: string
  isImpersonating: boolean
  radioStreamId: string
  icecastMount: string
  hasRadioStream: boolean
}

export class StreamingAuthError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message)
    this.name = 'StreamingAuthError'
  }
}

/**
 * Resuelve el contexto de streaming para la request actual.
 * Verifica que:
 *   1. El usuario esté autenticado
 *   2. (Si es ADMIN) pueda impersonar al cliente
 *   3. El cliente tenga un RadioStream
 *
 * ADMINs pueden pasar cualquier clientId (modo admin).
 * Lanza StreamingAuthError si algo falla.
 */
export async function requireStreamingClient(requestedClientId?: string): Promise<StreamingContext> {
  const session = await getEffectiveClient()
  if (!session) {
    throw new StreamingAuthError('No autenticado', 401)
  }

  // Si el cliente que pide no es el del session, verificar permisos
  if (requestedClientId && requestedClientId !== session.clientId && !session.isImpersonating) {
    throw new StreamingAuthError('No autorizado para acceder a este cliente', 403)
  }

  // El clientId efectivo (puede ser el impersonado o el del session)
  const effectiveClientId = session.clientId

  // Buscar el RadioStream del cliente
  const radioStream = await prisma.radioStream.findUnique({
    where: { clientId: effectiveClientId },
    select: { id: true, icecastMount: true, enabled: true },
  })

  if (!radioStream) {
    return {
      clientId: effectiveClientId,
      userId: '',
      userRole: '',
      isImpersonating: session.isImpersonating,
      radioStreamId: '',
      icecastMount: '',
      hasRadioStream: false,
      enabled: false,
    }
  }

  return {
    clientId: effectiveClientId,
    userId: '',
    userRole: '',
    isImpersonating: session.isImpersonating,
    radioStreamId: radioStream.id,
    icecastMount: radioStream.icecastMount,
    hasRadioStream: true,
    enabled: radioStream.enabled,
  }
}
