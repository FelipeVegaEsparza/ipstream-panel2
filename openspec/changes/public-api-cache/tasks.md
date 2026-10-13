# Tasks

## 1. Caché en proceso del contenido público

- [x] 1.1 Crear `lib/public-cache.ts` (Map por método+URL, TTL desde `PUBLIC_CONTENT_CACHE_TTL_MS`, `invalidatePublicCache(clientId?)`, wrapper `withPublicContentCache`) y verificar con `npx tsc --noEmit`
- [x] 1.2 Aplicar `withPublicContentCache` a los 18 GET read-only de `app/api/public/[clientId]/*` (announcers, basic-data, events, galleries, gc-bar, news, news/[slug], podcasts, podcasts/[id], polls, programs, promotions, social-networks, sponsors, videocasts, videocasts/[id], videos y el `[clientId]/route.ts`) y verificar con `npx tsc --noEmit`
- [x] 1.3 Agregar `PUBLIC_CONTENT_CACHE_TTL_MS` (opcional; `0` desactiva) a `deploy/docker-compose.prod.yml` y a `.env.example`

## 2. Invalidación al escribir

- [x] 2.1 Llamar `invalidatePublicCache(clientId)` en las rutas de escritura de contenido (`news`, `programs`, `sponsors`, `promotions`, `announcers`, `podcasts`, `videos`, `videocasts`, `galleries`, `events`, `gc-bar`, `polls`, `social-networks` y `basic-data`) y verificar con `npx tsc --noEmit`
- [x] 2.2 Verificar que los endpoints dinámicos (streaming/status, schedule/current, chat) NO usan el wrapper; verificar con `grep`

## 3. Verificación de integración

- [x] 3.1 Correr `npm run build` sin errores
- [x] 3.2 Ejecutar `loadtest/smoke.js` y una prueba funcional de frescura (crear/editar contenido y confirmar que la lectura pública se actualiza)
- [x] 3.3 Re-ejecutar `loadtest/mixed.js` (panel 50 + PWA 150) y comparar contra la línea base (p95 panel ~4 s / PWA ~1.6–2.3 s, 0 errores)
