import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeHost } from '@/lib/client-domains'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Endpoint `ask` para el TLS on-demand de Caddy: autoriza la emisión de un
 * certificado solo si el dominio está registrado y activo. Responde 2xx para
 * permitir y 4xx para denegar.
 */
export async function GET(request: NextRequest) {
  const domain = normalizeHost(new URL(request.url).searchParams.get('domain') || '')
  if (!domain) return new Response('domain requerido', { status: 400 })

  const found = await prisma.clientDomain.findFirst({
    where: { hostname: domain, status: 'active' },
    select: { id: true },
  })

  if (!found) return new Response('forbidden', { status: 403 })
  return new Response('ok', { status: 200 })
}
