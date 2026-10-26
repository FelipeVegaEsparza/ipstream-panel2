import { NextRequest } from 'next/server'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { normalizeHost, resolveClientByHost } from '@/lib/client-domains'

export async function OPTIONS() {
  return handleCors()
}

/**
 * GET /api/public/resolve-domain?host=<host>
 *
 * Mapea un host (subdominio de plataforma o dominio custom) al cliente activo.
 * Si no se pasa `host`, usa el header Host de la request.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const raw = url.searchParams.get('host') || request.headers.get('host') || ''
    const host = normalizeHost(raw)

    if (!host) {
      return createCorsErrorResponse('host es requerido', 400)
    }

    const resolved = await resolveClientByHost(host)

    if (!resolved) {
      return createCorsResponse({ found: false, hostname: host })
    }

    // El spread ya trae `hostname`; declararlo otra vez lo descartaba
    // (TS2783). Se conserva el valor que efectivamente se devolvía para no
    // cambiar el contrato de esta API pública.
    return createCorsResponse({ found: true, ...resolved })
  } catch (error) {
    console.error('Error resolving domain:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
