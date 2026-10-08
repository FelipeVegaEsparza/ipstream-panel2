/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, NetworkOnly } from 'workbox-strategies'

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
registerRoute(
  ({ url }) =>
    (url.hostname === 'panelipstream.cl' ||
      url.hostname.endsWith('.panelipstream.cl')) &&
    url.pathname.startsWith('/api/public'),
  new NetworkFirst({
    cacheName: 'ipstream-api-v1',
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
