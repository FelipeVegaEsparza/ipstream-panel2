// =====================================================
// Live Console — token de sesión de corta vida
// =====================================================
// Formato: base64url(payload).base64url(HMAC-SHA256(payload))
// El agente valida el mismo formato con la misma clave compartida.

import crypto from 'crypto'

export interface LiveTokenPayload {
  sid: string
  cid: string
  slotId: string | null
  mount: string
  transport: 'whip' | 'websocket'
  iat: number
  exp: number
}

export function liveSessionSecret(): string {
  return (
    process.env.LIVE_SESSION_SECRET ||
    process.env.STREAMING_AGENT_TOKEN ||
    'dev-live-session-secret-change-me'
  )
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sign(payload: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(payload).digest())
}

export function signLiveToken(
  payload: Omit<LiveTokenPayload, 'iat' | 'exp'>,
  ttlSeconds = 120,
  secret = liveSessionSecret()
): { token: string; expiresAt: string } {
  const now = Math.floor(Date.now() / 1000)
  const full: LiveTokenPayload = { ...payload, iat: now, exp: now + ttlSeconds }
  const encoded = base64url(JSON.stringify(full))
  return {
    token: `${encoded}.${sign(encoded, secret)}`,
    expiresAt: new Date(full.exp * 1000).toISOString(),
  }
}
