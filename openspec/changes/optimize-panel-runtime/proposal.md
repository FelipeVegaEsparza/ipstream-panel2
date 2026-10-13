# Proposal

## Why

Las pruebas de carga contra el VPS de 4 vCPU mostraron que el panel topa en ~100 req/s autenticadas y ~150 req/s públicas, y que se degrada a partir de ~50 operadores concurrentes activos. El limitante no es el host (load ~2/4) ni MySQL (CPU <15%, 28 conexiones): es el **único proceso Node** (`next start`), cuyo event loop se satura ejecutando trabajo que no escala (resolución de sesión/permisos de menú por request, hashing de contraseña bloqueante) y sirviendo endpoints públicos read-only sin caché. Además, una ráfaga de logins bloquea el event loop y congela el panel para todos.

## What Changes

- **Caché de permisos de menú**: resolver los items ocultos de menú por cliente con TTL corto en proceso, invalidando al cambiar la configuración global o por cliente. Hoy se consulta `appConfig` + `clientMenuItem` en cada request de 30 rutas.
- **Deduplicación por request de sesión/cliente efectivo**: memoizar `getServerSession` y `getEffectiveClient` con `cache()` de React para no re-verificar el JWT ni releer cookies 2-3 veces por request.
- **Hash de contraseña fuera del event loop**: usar una implementación nativa asíncrona (Rust/N-API) para `hash`/`verify` y bajar el cost de altas nuevas de 12 a 10. Elimina el congelamiento por picos de login.
- **Caché HTTP de la API pública read-only**: emitir `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` en los GET públicos (noticias, programas, basic-data, etc.) para que Caddy/CDN absorban el tráfico masivo de oyentes.

**No-goals (fuera de alcance)**: escalado horizontal (varias réplicas de `app` detrás de Caddy), rate-limit compartido (DB/Redis), y cambios de infraestructura/región. Quedan como change de seguimiento.

## Capabilities

### New Capabilities

- `platform/panel-runtime`: eficiencia del proceso Node del panel por request — caché de permisos de menú, deduplicación de sesión/cliente y hashing de contraseña no bloqueante.
- `platform/public-api-caching`: comportamiento de caché HTTP de los endpoints públicos read-only de la PWA.

### Modified Capabilities

- Ninguna.

## Impact

- **Código**: `lib/menu-permissions.ts` (+ invalidación en `app/api/admin/global-menu` y `app/api/admin/clients/[id]/menu`); `lib/getEffectiveClient.ts` y nueva capa de sesión cacheada usada por las rutas (`app/api/**`); `lib/auth.ts` y rutas de alta/cambio de password (`app/api/auth/register`, `app/api/admin/users/*`, `app/api/admin/create-super-user`) + scripts; rutas `app/api/public/[clientId]/*`.
- **Dependencias**: agregar `@node-rs/bcrypt` (binarios prehechos, sin build nativo). Reemplaza el uso de `bcryptjs` en verificación/hash.
- **Sin cambios**: schema Prisma, UI/tokens de diseño, streaming/agente/nodos, deploy scripts.
- **Compatibilidad**: los hashes `$2a$` existentes siguen válidos; solo cambia el cost de los nuevos.
