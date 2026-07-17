import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key'

export interface ImpersonationPayload {
  adminId: string
  adminEmail: string | null | undefined
  clientId: string
  clientUserId: string
  clientEmail: string
  clientName: string
  projectName: string
  timestamp: number
}

export async function signJWT(payload: ImpersonationPayload): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' })
}

export async function verifyJWT(token: string): Promise<ImpersonationPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ImpersonationPayload
    return decoded
  } catch (error) {
    console.error('Error verifying JWT:', error)
    return null
  }
}

export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('impersonate') === 'true'
}

export function getImpersonationToken(): string | null {
  if (typeof window === 'undefined') return null
  
  return localStorage.getItem('impersonation_token')
}

export function setImpersonationToken(token: string): void {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('impersonation_token', token)
}

export function clearImpersonationToken(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem('impersonation_token')
}

export async function getImpersonationData(): Promise<ImpersonationPayload | null> {
  const token = getImpersonationToken()
  if (!token) return null
  
  return await verifyJWT(token)
}