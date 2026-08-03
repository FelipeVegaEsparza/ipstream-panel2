import { SignJWT, jwtVerify } from 'jose'

const TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000 // 2 horas

export interface ImpersonationData {
  adminId: string
  adminEmail: string
  clientId: string
  clientUserId: string
  clientEmail: string
  clientName: string
  timestamp: number
  expires: number
}

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET no está definida')
  }
  return new TextEncoder().encode(secret)
}

export async function signImpersonationToken(
  data: Omit<ImpersonationData, 'timestamp' | 'expires'>
): Promise<string> {
  const now = Date.now()
  return new SignJWT({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    clientId: data.clientId,
    clientUserId: data.clientUserId,
    clientEmail: data.clientEmail,
    clientName: data.clientName,
    timestamp: now,
    expires: now + TOKEN_MAX_AGE_MS
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor((now + TOKEN_MAX_AGE_MS) / 1000))
    .sign(getSecret())
}

export async function verifyImpersonationToken(
  token: string
): Promise<ImpersonationData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const data = payload as unknown as ImpersonationData

    if (
      typeof data.adminId !== 'string' ||
      typeof data.clientId !== 'string' ||
      typeof data.expires !== 'number' ||
      Date.now() >= data.expires
    ) {
      return null
    }

    return data
  } catch {
    return null
  }
}
