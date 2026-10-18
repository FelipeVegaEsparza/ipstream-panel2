// =====================================================
// Live Console — llamadas panel → agente
// =====================================================

import { resolveRadioServerTarget } from './streaming-servers'

export class LiveAgentError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message)
    this.name = 'LiveAgentError'
  }
}

export async function liveAgentRequest<T = unknown>(
  clientId: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const target = await resolveRadioServerTarget(clientId)
  if (!target) throw new LiveAgentError('No hay servidor de streaming asignado', 503)

  const res = await fetch(`${target.baseUrl}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${target.token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  })

  const text = await res.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { body = text }
  }
  if (!res.ok) {
    const message =
      (body as { message?: string; error?: string } | null)?.message ||
      (body as { error?: string } | null)?.error ||
      `Agente respondió ${res.status}`
    throw new LiveAgentError(message, res.status, body)
  }
  return body as T
}
