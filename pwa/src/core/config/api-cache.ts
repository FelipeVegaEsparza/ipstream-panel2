// =====================================================
// API cache — decide si una request pública es cacheable por el SW
// =====================================================
// El bundle de producción usa la API same-origin (VITE_API_BASE=""), mientras
// que un build con origen explícito puede apuntar al panel. El service worker
// solo debe cachear el origen configurado, nunca el panel viejo.

export function shouldCachePublicApi(
  url: URL,
  configuredOrigin: string,
  selfOrigin: string
): boolean {
  const origin = (configuredOrigin.trim() || selfOrigin).replace(/\/+$/, '')
  return url.origin === origin && url.pathname.startsWith('/api/public')
}
