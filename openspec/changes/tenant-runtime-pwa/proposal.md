# Proposal

## Why

Hoy la PWA de clientes se construye **una vez por cliente** (`scripts/build-client.mjs` inyecta `clientId`, iconos, OG y nombre en el build, y se despliega `dist/<cliente>/` aparte). Con un producto que itera rápido y templates que cambian seguido, cada fix o plantilla nueva obliga a reconstruir y redeployar **N veces**. Queremos un solo artefacto multi-tenant resuelto por dominio: alta de cliente = fila en DB + DNS, y una actualización del producto llega a todos con **un** deploy.

## What Changes

- **Panel — registro de dominios**: nuevo modelo `ClientDomain { clientId, hostname, kind: subdomain|custom, status, verifyToken, isPrimary }` y endpoint público `GET /api/public/resolve-domain?host=<host>` que mapea host → `clientId` (con caché).
- **Panel — shell dinámico por tenant**: por dominio, servir `index.html` con OG/Twitter inyectados en server, `manifest.webmanifest` dinámico (nombre/theme/iconos) e iconos del cliente (`favicon.png`, `icon-192/512`, `maskable`, `apple-touch-icon`), tomando branding de `BasicData`/uploads.
- **Panel — hosting del bundle único**: servir los assets estáticos del único build de la PWA (`pwa/dist`) y el shell dinámico por dominio desde la infra del panel (Caddy), con fallback SPA.
- **Panel — provisión de dominios**: job en background (patrón `node-provisioner.ts`) que, al asignarse un dominio, crea el registro DNS del subdominio y prepara el dominio custom (CNAME + verificación); endpoint `ask` para TLS on-demand.
- **PWA — tenant en runtime** (**BREAKING** interno): reemplazar la resolución por `VITE_CLIENT_ID` horneado por resolución de host en runtime (`resolve-domain`), manteniendo el build como fallback de desarrollo. Actualizar la spec de multitenancy.
- **PWA — templates**: code-splitting (lazy) del registro de templates, fallback a `DEFAULT_TEMPLATE_ID` ante error, y pin por cliente vía `selectedTemplate` (ya runtime).
- **PWA — limpieza**: deprecar `build-client.mjs`/`new-client.mjs` como flujo de producción (quedan solo para dev/marca), y `clients/*` como data de build.
- **BREAKING (operativo)**: el despliegue deja de ser "un sitio por cliente"; pasa a ser un bundle único + dominios.

## Capabilities

### New Capabilities

- `client-sites/domain-registry`: registro y resolución de dominios por cliente (subdominio propio y dominio custom), y su verificación/estado.
- `client-sites/tenant-shell`: shell dinámico por dominio (HTML/OG, manifest e iconos) servido para el bundle único de la PWA.
- `client-sites/pwa-runtime`: la PWA resuelve su tenant (clientId, API base, branding) en runtime a partir del host, con fallback y manejo de cliente desconocido.
- `client-sites/domain-provisioning`: alta automatizada de dominios (DNS del subdominio, preparación del dominio custom, TLS) al contratar/asignar un cliente.

### Modified Capabilities

- Ninguna. Las specs de la PWA vivían en su repo original (no se copiaron en `add-pwa-folder`); el comportamiento nuevo de la PWA se declara como capacidad nueva `client-sites/pwa-runtime` en este repo.

## Impact

- **Prisma**: nuevo modelo `ClientDomain` (y relación en `Client`). Migración vía `prisma db push` (flujo habitual).
- **API panel**: `GET /api/public/resolve-domain`, shell por dominio (`index.html`/`manifest.webmanifest`/iconos), endpoint `ask` de TLS, y job de provisión (dashboard/admin).
- **Deploy / infra**: `deploy/Caddyfile` (wildcard/on-demand TLS, routing por dominio al shell/bundle), `docker-compose*.yml` (montar `pwa/dist`), `.github/workflows/deploy.yml` (build de la PWA y publicación).
- **PWA (`pwa/`)**: `src/core/config/tenant*` (runtime), `src/app/App.tsx`, `src/templates/index.tsx` (lazy/fallback), `vite.config.ts` (manifest runtime vs build), scripts de build.
- **Config**: base de la API deja de ser hardcodeada (`IPSTREAM_BASE`) y pasa a derivarse del entorno/host.
- **Fuera de alcance**: pagos, facturación, y cualquier cambio de las specs existentes del panel (`television/*`, `dj-connection/*`, etc.).
