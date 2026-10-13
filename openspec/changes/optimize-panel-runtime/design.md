# Design

## Context

Ver `proposal.md - Why`. Restricciones relevantes del estado actual:

- El panel corre como **un único proceso Node** (`next start`) en un contenedor; no hay Redis ni store compartido.
- 30 rutas usan un guard de menú (`MENU_GUARD_INJECTED`) que consulta `appConfig` + `clientMenuItem` en cada request (`lib/menu-permissions.ts`).
- `getServerSession` se usa en 106 archivos de `app/api` y `getEffectiveClient` en 52; varias rutas resuelven ambos.
- El hashing de contraseña usa `bcryptjs` (JS puro) en `lib/auth.ts`, altas y scripts.
- Los endpoints públicos (`app/api/public/[clientId]/*`, 31 rutas) casi no declaran caché.

## Goals / Non-Goals

**Goals:**
- Subir el techo de requests/segundo del proceso Node y quitar el congelamiento por login, sin tocar infraestructura ni deploy.
- Que los cambios sean reversibles y no alteren UX, tokens de diseño ni el schema.

**Non-Goals:**
- Escalar horizontalmente (réplicas) o compartir rate-limit.
- Cachear a nivel de base de datos o introducir Redis.
- Cambiar el hashing de contraseñas existentes.

## Decisions

**1. Caché de permisos de menú en proceso, con TTL e invalidación explícita.**
Nuevo módulo `lib/menu-cache.ts` con `Map<clientId, {disabled: Set, at: number}>` y TTL `MENU_CACHE_TTL_MS` (default 30000). `getDisabledMenuItems(clientId)` y `isMenuItemEnabled(clientId, key)` leen de la caché; `invalidateMenuCache(clientId?)` la limpia. Se invoca la invalidación en las mutaciones de menú global (`app/api/admin/global-menu/route.ts`) y por cliente (`app/api/admin/clients/[id]/menu/route.ts`).
- Alternativa descartada: cachear dentro de cada ruta (duplicación) o memoizar por proceso con `unstable_cache` (pensado para data fetching de RSC, no route handlers).
- Trade-off: con una sola instancia la invalidación es inmediata; si a futuro hay réplicas, el cambio propaga dentro del TTL (30s).

**2. Deduplicación de sesión por request con `cache()` de React.**
Nuevo `lib/session.ts` que exporta `getSession = cache(() => getServerSession(authOptions))`. `getEffectiveClient` pasa a usarla internamente. Las rutas de `app/api/**` que hoy llaman `getServerSession(authOptions)` directamente se migran a `getSession()` (cambio mecánico). React `cache()` está soportado en Route Handlers de Next.js App Router y memoiza por request.
- Alternativa descartada: resolver el JWT a mano o cachear en `globalThis` (fuga entre requests).

**3. Hashing de contraseña asíncrono nativo.**
Reemplazar `bcryptjs` por `@node-rs/bcrypt` (Rust/N-API, binarios prehechos, sin toolchain) en `lib/auth.ts`, altas de usuario y scripts. `hash(pw, 10)` y `verify(pw, hash)` async corren fuera del event loop. Los hashes `$2a$/$2b$` existentes siguen verificándose.
- Alternativa descartada: `worker_threads` con `bcryptjs` (más código y mantenimiento) o `bcrypt` nativo (requiere toolchain/download en build); bajar el cost sin mover el cómputo no evita el bloqueo.

**4. Caché HTTP de contenido público.**
Helper `lib/http-cache.ts` con `publicCacheHeaders()` (`public, s-maxage=60, stale-while-revalidate=300`) aplicado a los GET de contenido públicos. Los endpoints dinámicos (streaming status, schedule current, chat, votos, escrituras) mantienen `no-store`. La fuente de verdad es el route handler; Caddy/CDN solo lo respeta.
- Alternativa descartada: agregar la cabecera solo en Caddy (rompe consumidores directos y es más difícil de testear).

## Risks / Trade-offs

- **Staleness del menú (hasta 30s en réplicas futuras)** → TTL corto + invalidación explícita en las mutaciones.
- **`@node-rs/bcrypt` no instala en el runner** → es prebuilt por plataforma (linux-x64-gnu); validar `npm ci` en el build de CI; fallback: volver a `bcryptjs` bajando el cost a 10.
- **Codemod de `getServerSession` en 106 archivos** → typecheck (`tsc --noEmit`) obligatorio antes de commit; el reemplazo es textual y uniforme.
- **Cachear un endpoint que no debería** → lista blanca explícita de rutas read-only; los dinámicos/personalizados quedan fuera.
- **Sin cambios de schema** → rollback = revertir el commit y redeploy.

## Migration Plan

1. Implementar y typecheck local.
2. Deploy normal (push a `main`); no requiere "Actualizar nodo" (afecta solo al panel).
3. Verificación: repetir el test de carga (`loadtest/`) y comparar techo/latencia contra la línea base (25/50/100 VUs).
4. Rollback: revertir el commit y redeploy.

## Open Questions

- Ninguna bloqueante. Si más adelante se adoptan réplicas, reevaluar el TTL de menú y migrar el rate-limit (change de seguimiento).
