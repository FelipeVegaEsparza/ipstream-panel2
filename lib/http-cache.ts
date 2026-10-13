// =====================================================
// Cabeceras de caché para respuestas públicas read-only
// =====================================================
// Un proxy/CDN puede reutilizar la respuesta y refrescarla en segundo plano.
// Aplicar SOLO a GET de contenido que no depende de identidad ni de estado vivo.

export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

export function publicCacheHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return { 'Cache-Control': PUBLIC_CACHE_CONTROL, ...extra }
}
