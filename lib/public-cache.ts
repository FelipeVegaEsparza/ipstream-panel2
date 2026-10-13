// =====================================================
// Caché en proceso del contenido público read-only
// =====================================================
// Reduce la carga de los espectadores de la PWA: las respuestas GET de contenido
// (noticias, programas, etc.) se sirven desde memoria durante un TTL corto.
//
// TTL: PUBLIC_CONTENT_CACHE_TTL_MS (default 10000; 0 desactiva).
//
// Alcance: cada worker del cluster tiene su propia caché. La invalidez se aplica
// en el worker que atiende la escritura; el resto refresca a más tardar dentro
// del TTL (esa es la garantía de frescura).

import { NextRequest } from 'next/server'

export const PUBLIC_CONTENT_CACHE_TTL_MS = (() => {
  const raw = process.env.PUBLIC_CONTENT_CACHE_TTL_MS
  if (raw === undefined || raw === '') return 10000
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 10000
})()

interface CacheEntry {
  at: number
  status: number
  body: string
  headers: [string, string][]
}

const cache = new Map<string, CacheEntry>()

function cacheKey(req: NextRequest): string {
  const url = new URL(req.url)
  return `${req.method}:${url.pathname}${url.search}`
}

/**
 * Invalida la caché de contenido público.
 * - Sin `clientId`: limpia todo.
 * - Con `clientId`: limpia solo las entradas de ese cliente.
 */
export function invalidatePublicCache(clientId?: string): void {
  if (!clientId) {
    cache.clear()
    return
  }
  const marker = `/api/public/${clientId}`
  for (const key of cache.keys()) {
    if (key.includes(marker)) cache.delete(key)
  }
}

/**
 * Envuelve un handler GET de contenido público. Solo cachea respuestas 200 de
 * método GET; el resto pasa directo.
 */
export function withPublicContentCache<Ctx>(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response>
): (req: NextRequest, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    if (req.method !== 'GET' || PUBLIC_CONTENT_CACHE_TTL_MS <= 0) {
      return handler(req, ctx)
    }

    const key = cacheKey(req)
    const now = Date.now()
    const hit = cache.get(key)
    if (hit && now - hit.at <= PUBLIC_CONTENT_CACHE_TTL_MS) {
      return new Response(hit.body, { status: hit.status, headers: hit.headers })
    }

    const res = await handler(req, ctx)
    if (res.status === 200) {
      try {
        const body = await res.clone().text()
        const headers: [string, string][] = []
        res.headers.forEach((value, name) => {
          headers.push([name, value])
        })
        cache.set(key, { at: now, status: 200, body, headers })
      } catch {
        // Si no se puede leer el body, no se cachea.
      }
    }
    return res
  }
}
