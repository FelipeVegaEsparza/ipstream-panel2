import { NextRequest, NextResponse } from 'next/server'
import {
  createCachedCorsResponse,
  createCorsErrorResponse,
  handleCors,
} from '@/lib/cors'
import { normalizeLocale } from '@/lib/site-content'
import { getPublicSiteContent } from '@/lib/site-content-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/public/site-content?locale=es|en
 *
 * Contenido editorial publicado para el sitio de CasterFly.
 */
export async function GET(request: NextRequest) {
  try {
    const locale = normalizeLocale(request.nextUrl.searchParams.get('locale'))
    const data = await getPublicSiteContent(locale)
    return createCachedCorsResponse({
      locale,
      version: data.version,
      updatedAt: data.updatedAt,
      content: data.content,
    })
  } catch (error) {
    console.error('Error reading public site content:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
