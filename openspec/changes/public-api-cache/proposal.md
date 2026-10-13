# Proposal

## Why

Los espectadores de la PWA pegan al API público (`/api/public/*`), que hoy recomputa cada respuesta contra MySQL en cada request. En el test mixto, con panel + PWA a la vez, ese tráfico compite por CPU con el panel (mismo Node) y baja el techo conjunto (~160 req/s). El contenido público es read-only y cambia poco, así que cachearlo unos segundos reduce fuerte la carga sin afectar al panel.

## What Changes

- **Caché en proceso del contenido público read-only** con TTL corto configurable (`PUBLIC_CONTENT_CACHE_TTL_MS`, default 10000). Cada worker guarda por `método+URL` (incluye `clientId`).
- **Invalidación en las escrituras**: al crear/editar/borrar contenido del cliente se invalida la caché de ese cliente, para que lo nuevo aparezca sin esperar el TTL.
- **Frescura**: en el proceso que escribe es inmediata; en los demás procesos/instancias del cluster, dentro del TTL (≤10 s). El TTL es la garantía de frescura.
- Los endpoints **dinámicos o por-usuario** (chat, "ahora suena", votos, programación actual, escrituras) siguen sin cachearse.

**No-goals**: CDN/Cloudflare, Redis, y separar la PWA a otro VPS (fases futuras).

## Capabilities

### New Capabilities

- `platform/public-api-cache`: caché de respuestas del contenido público read-only con TTL corto e invalidación al escribir.

### Modified Capabilities

- Ninguna.

## Impact

- **Código**: nuevo `lib/public-cache.ts`; wrapper aplicado a los GET read-only de `app/api/public/[clientId]/*`; llamadas de invalidación en las rutas de escritura de contenido (`app/api/news`, `programs`, `sponsors`, `promotions`, `announcers`, `podcasts`, `videos`, `videocasts`, `galleries`, `events`, `gc-bar`, `polls`, `social-networks`, `basic-data`).
- **Config**: `PUBLIC_CONTENT_CACHE_TTL_MS` (opcional; `0` desactiva) en `deploy/docker-compose.prod.yml` y `.env.example`.
- **Sin cambios**: schema, UI, streaming, deploy.
