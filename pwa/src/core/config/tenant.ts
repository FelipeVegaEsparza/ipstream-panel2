export const IPSTREAM_BASE = 'https://panelipstream.cl'
export const API_PUBLIC_PREFIX = '/api/public'

export function getPublicApiBase(clientId: string): string {
  return `${IPSTREAM_BASE}${API_PUBLIC_PREFIX}/${clientId}`
}

export function getBakedClientId(): string | null {
  return (import.meta.env.VITE_CLIENT_ID as string | undefined) || null
}

export function getBakedClientName(): string | null {
  return (import.meta.env.VITE_CLIENT_NAME as string | undefined) || null
}
