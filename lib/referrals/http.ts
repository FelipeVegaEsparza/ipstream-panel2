import { NextRequest } from 'next/server'

/** IP real del solicitante (Caddy agrega la IP al final de x-forwarded-for). */
export function getRequestIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const lastHop = forwarded
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .pop()
  return lastHop || request.headers.get('x-real-ip') || 'unknown'
}
