import { NextRequest } from 'next/server'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { prisma } from '@/lib/prisma'
import { getClientSitesConfig } from '@/lib/client-sites-config'
import { slugifyRadioName, slugError, buildSiteHost, SLUG_MIN_LENGTH } from '@/lib/domain-slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/public/check-subdomain?name=<nombre de la radio>
 *
 * Devuelve el slug normalizado y si el subdominio está disponible. No crea nada.
 */
export async function GET(request: NextRequest) {
  try {
    const name = new URL(request.url).searchParams.get('name') || ''
    const slug = slugifyRadioName(name)
    const { domain } = await getClientSitesConfig()

    const err = slugError(slug)
    if (err) {
      return createCorsResponse({ ok: true, slug, available: false, reason: err, minLength: SLUG_MIN_LENGTH })
    }
    if (!domain) {
      return createCorsResponse({ ok: true, slug, available: false, reason: 'unconfigured' })
    }

    const hostname = buildSiteHost(slug, domain)
    const existing = await prisma.clientDomain.findUnique({
      where: { hostname },
      select: { id: true },
    })

    return createCorsResponse({
      ok: true,
      slug,
      hostname,
      siteUrl: `https://${hostname}`,
      available: !existing,
      reason: existing ? 'taken' : null,
    })
  } catch (error) {
    console.error('Error checking subdomain:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
