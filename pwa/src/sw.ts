/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { shouldCachePublicApi } from '@/core/config/api-cache'

declare let self: ServiceWorkerGlobalScope

// Toma el control de inmediato (registerType: 'autoUpdate' recarga la página
// cuando hay una versión nueva).
self.skipWaiting()
clientsClaim()

// Navegaciones (SPA): red primero para traer un index fresco; si no hay red,
// se sirve el shell precacheado y, como último recurso, la página offline.
registerRoute(
  new NavigationRoute(async ({ request }) => {
    try {
      return await fetch(request)
    } catch {
      const shell = await matchPrecache('index.html')
      if (shell) return shell
      const offline = await matchPrecache('offline.html')
      if (offline) return offline
      return Response.error()
    }
  })
)

// Streaming y chat nunca se cachean: el estado en vivo no debe quedar obsoleto.
registerRoute(
  ({ url }) =>
    url.pathname.includes('/streaming') || url.pathname.includes('/chat'),
  new NetworkOnly()
)

// API pública: network-first con respaldo en caché de corta duración.
// El origen se configura en build (VITE_API_BASE). Vacío = mismo origen del
// sitio del cliente; nunca se cachea el panel viejo.
const API_ORIGIN = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

registerRoute(
  ({ url }) => shouldCachePublicApi(url, API_ORIGIN, self.location.origin),
  new NetworkFirst({
    cacheName: 'casterfly-api-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 10 * 60 })
    ]
  })
)

// Assets hasheados del build.
precacheAndRoute(self.__WB_MANIFEST)

// Red de seguridad: cualquier navegación sin respuesta cae en la página offline.
setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    const shell = await matchPrecache('index.html')
    if (shell) return shell
    const offline = await matchPrecache('offline.html')
    if (offline) return offline
  }
  return Response.error()
})
