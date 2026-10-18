// =====================================================
// Live Console — validación de token de sesión
// =====================================================
// Formato compartido con el panel: base64url(payload).base64url(hmac)

import crypto from 'crypto'

function sessionSecret() {
  return (
    process.env.LIVE_SESSION_SECRET ||
    process.env.STREAMING_AGENT_TOKEN ||
    'dev-live-session-secret-change-me'
  )
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(padded, 'base64')
}

function safeEqual(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

/** Devuelve el payload si el token es válido y no expiró; null en caso contrario. */
export function verifyLiveToken(token) {
  if (typeof token !== 'string') return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expected = crypto
    .createHmac('sha256', sessionSecret())
    .update(encoded)
    .digest()

  const received = fromBase64url(signature)
  if (!safeEqual(expected, received)) return null

  let payload
  try {
    payload = JSON.parse(fromBase64url(encoded).toString('utf8'))
  } catch {
    return null
  }

  const now = Math.floor(Date.now() / 1000)
  if (!payload?.sid || !payload?.cid || !payload?.mount) return null
  if (payload.transport !== 'whip' && payload.transport !== 'websocket') return null
  if (typeof payload.exp !== 'number' || payload.exp < now) return null

  return payload
}

export function bearerToken(request) {
  const header = request.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}
