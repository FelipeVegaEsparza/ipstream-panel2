export const API_PUBLIC_PREFIX = '/api/public'

// Origen por defecto del panel/API. Se puede sobrescribir con VITE_API_BASE
// (por ejemplo vacío para same-origin, cuando el sitio y el API comparten
// dominio). El build de sitio de cliente deja VITE_API_BASE vacío.
export const DEFAULT_API_ORIGIN = 'https://panelipstream.cl'

export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined
  const origin = raw === undefined ? DEFAULT_API_ORIGIN : raw
  return origin.trim().replace(/\/+$/, '')
}

export function getPublicApiBase(clientId: string): string {
  return `${getApiOrigin()}${API_PUBLIC_PREFIX}/${clientId}`
}

export function getBakedClientId(): string | null {
  return (import.meta.env.VITE_CLIENT_ID as string | undefined) || null
}

export function getBakedClientName(): string | null {
  return (import.meta.env.VITE_CLIENT_NAME as string | undefined) || null
}

export interface ResolvedTenant {
  clientId: string
  name: string | null
}

/**
 * Resuelve el tenant a partir del host consultando el panel. Devuelve null si
 * el host no está registrado o la consulta falla (sin lanzar).
 */
export async function resolveTenantByHost(host: string): Promise<ResolvedTenant | null> {
  const h = (host || '').trim().toLowerCase()
  if (!h) return null

  const url = `${getApiOrigin()}/api/public/resolve-domain?host=${encodeURIComponent(h)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const data = (await res.json()) as {
      found?: boolean
      clientId?: string
      clientName?: string | null
    }
    if (data?.found && data.clientId) {
      return { clientId: data.clientId, name: data.clientName ?? null }
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
