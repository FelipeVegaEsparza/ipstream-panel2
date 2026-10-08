# Design

## Context

Ver `proposal.md - Why`. Estado relevante tras `add-pwa-folder`:

- La PWA vive en `pwa/` como app React 19 + Vite, con dependencias aisladas. Su arquitectura actual es **build por cliente**: `scripts/build-client.mjs` inyecta `VITE_CLIENT_ID`/`VITE_CLIENT_NAME`, fusiona iconos y hornea OG en `dist/<cliente>/`.
- El tenant se lee del build (`src/core/config/tenant.ts`, `getBakedClientId()`), con una máquina de estados ya existente (`resolving | ready | notFound`) en `TenantContext.tsx`.
- El template **ya** es runtime: `selectedTemplate` viene de la API y `TemplateSlot` lo resuelve contra un registro estático (`src/templates/index.tsx`).
- El panel ya es multi-tenant por `clientId` (API pública `/api/public/[clientId]/*`) y ya expone branding (`accentColor`, logos, OneSignal).
- Restricción: no romper el panel ni los nodos de streaming (`lib/node-provisioner.ts` asume `streaming/` en la raíz).

## Goals / Non-Goals

**Goals:**
- Un único build de la PWA sirviendo a N clientes, resuelto por dominio.
- Alta de cliente = fila en DB + dominio; sin reconstruir la app.
- Branding (OG, manifest, iconos) resuelto en el servidor por dominio.
- Provisión automática de subdominios y preparación de dominios custom, con TLS.
- Actualizaciones del producto llegan a todos los clientes con un deploy.

**Non-Goals:**
- No se aloja el sitio del cliente en infra separada por cliente.
- No se cambia la API pública existente (`/api/public/[clientId]/*`) más allá de agregar `resolve-domain`.
- No se reescriben los templates (solo cambia cómo se cargan).
- No se tocan streaming, facturación ni las specs existentes del panel.

## Decisions

### 1. Servido: Caddy sirve estáticos; el panel sirve el shell dinámico
El bundle único de la PWA se construye con `npm run build` y su `pwa/dist` se publica a la infra del panel (volumen/mount). Caddy resuelve por host:

```
host de cliente →
  /assets/*, /sw.js, /registerSW.js, /offline.html  → file_server (pwa/dist)   [estático, cacheable]
  /manifest.webmanifest, /favicon.png, /icon-*.png  → panel (dinámico por tenant)
  / y cualquier ruta SPA                            → panel (index.html con OG inyectado)
```

- **Por qué Caddy y no que Next sirva todo**: los assets estáticos y el service worker los sirve Caddy sin pasar por Node (eficiencia y correcto scope del SW); el panel solo atiende lo dinámico.
- **Alternativa considerada — Next sirve todo**: más simple de configurar pero mete el bundle de la PWA en cada request de Node y complica headers/SW.
- **Alternativa considerada — edge/Cloudflare Pages**: válida a futuro; se descarta por ahora para no sumar otro proveedor de deploy.

### 2. Detección de "host de cliente" vs host del panel
`middleware.ts` ya distingue rutas. Se agrega: si el `Host` entrante corresponde a un `ClientDomain` activo (y no al host del panel ni a `stream`), las rutas `/`, manifest e iconos se enrutan al **shell de tenant**. El resto del panel sigue igual.

- **Por qué en el panel**: ya tiene Prisma y la tabla de dominios; una sola fuente de verdad.
- La resolución se cachea en memoria con TTL corto (p. ej. 60 s) para no golpear la DB en cada request.

### 3. Modelo `ClientDomain` y resolución
```
ClientDomain {
  id, clientId, hostname (unique), kind: subdomain|custom,
  status: pending|active|error, isPrimary, verifyToken,
  provisionStatus, provisionLog, provisionError, provisionedAt,
  createdAt, updatedAt
}
```
`GET /api/public/resolve-domain?host=` normaliza el host (lowercase, sin puerto/punto final), prueba coincidencia exacta y, para el dominio base de la plataforma, resuelve por etiqueta de subdominio.

### 4. TLS
- **Custom domains**: Caddy `on_demand_tls` con `ask` → `GET /api/domains/ask?domain=` del panel, que autoriza solo dominios `active`. Evita emitir certs a cualquiera que apunte a la IP.
- **Subdominios de plataforma**: wildcard `*.panelipstream.cl` (DNS-01 vía Cloudflare) como opción preferida para no emitir un cert por subdominio; si implica una imagen de Caddy con plugin, arranque con on-demand y migrar a wildcard al escalar.
- **Trade-off**: on-demand es simple pero consume rate limits de Let's Encrypt a escala; wildcard requiere plugin DNS.

### 5. Tenant en runtime en la PWA
`TenantProvider` pasa de resolución síncrona (build) a asíncrona: consulta `resolve-domain` con `location.hostname`; si falla, cae al `clientId` horneado (dev) o pasa a `notFound`. La máquina de estados existente (`resolving|ready|notFound`) se reutiliza tal cual.

- Base de API configurable (`VITE_API_BASE` o derivada de `VITE_PANEL_BASE`), con default same-origin `/api/public`. Elimina el `IPSTREAM_BASE` hardcodeado.
- **Alternativa considerada — resolver por path** (`/c/<clientId>/`): se descarta; el objetivo es dominio por cliente.

### 6. Templates: lazy + fallback
`src/templates/index.tsx` pasa de imports estáticos a `React.lazy` + `Suspense`, con `ErrorBoundary` que cae a `DEFAULT_TEMPLATE_ID`. Permite crecer el registro sin inflar el chunk inicial de todos los clientes.

### 7. Provisión de dominios como job en background
Se reutiliza el patrón de `lib/node-provisioner.ts` (mapa de jobs activos, `provisionLog`, estados). Proveedor DNS: Cloudflare API (`CLOUDFLARE_API_TOKEN`, `CLIENT_SITES_DOMAIN`, `CLIENT_SITES_TARGET`). Subdominio = crear registro; custom = verificar CNAME + `ask` de TLS.

### 8. Gobernanza de specs de la PWA
Las specs originales de la PWA no se copiaron en `add-pwa-folder`. A partir de este cambio, el comportamiento del tenant runtime de la PWA se especifica en este repo (`openspec/specs/client-sites/*`). El repo original de la PWA queda como histórico; este repo es la fuente de verdad.

## Risks / Trade-offs

- **Un bug de shell/template golpea a todos** → fallback a template por defecto, pin por cliente (`selectedTemplate` en DB) y poder servir una versión anterior del bundle (tag de imagen).
- **SW/asset caching entre tenants** → el bundle es idéntico para todos; el SW no debe cachear respuestas dependientes del host más allá de lo previsto. Revisar `injectManifest`/`globPatterns` y no cachear el shell dinámico.
- **Rate limits de Let's Encrypt** → arrancar con on-demand, migrar a wildcard/cert por lots.
- **CORS/base de API** → hoy `Access-Control-Allow-Origin: *`; si el sitio y la API quedan same-origin no hay CORS. Mantener explícito.
- **Migración de clientes existentes** → cada cliente actual pasa de `dist/<cliente>/` a un `ClientDomain`; hay que cargar sus dominios y apagar sus deploys viejos.
- **Secretos** → `CLOUDFLARE_API_TOKEN` en `.env` del VPS, nunca en el repo.

## Migration Plan

1. **Fase A (panel, sin PWA)**: modelo `ClientDomain` + `resolve-domain` + UI admin de dominios. No rompe nada (la PWA sigue con build).
2. **Fase B (shell)**: servir `pwa/dist` y shell dinámico por host; dominios de clientes activos empiezan a resolver al bundle único.
3. **Fase C (PWA runtime)**: cambiar la resolución de tenant a runtime + lazy templates. La PWA funciona igual con build (fallback).
4. **Fase D (provisión)**: DNS automático, verificación custom, `ask` de TLS.
5. **Fase E (retiro)**: deprecar `build-client.mjs` como flujo de producción y limpiar infra por cliente.

**Rollback**: A–D son aditivos. Mientras `resolve-domain`/shell no estén activos, el build-por-cliente sigue funcionando. En C, el fallback al `clientId` horneado permite volver atrás rápido.

## Open Questions

- ¿Dominio base de subdominios de clientes? (`<slug>.panelipstream.cl` vs `*.clientes.panelipstream.cl`). No cambia specs ni tareas; se decide al configurar DNS/Caddy.
- ¿Cloudflare for SaaS en vez de Caddy on-demand para dominios custom? Es una alternativa de infra; se puede cambiar sin tocar specs.
