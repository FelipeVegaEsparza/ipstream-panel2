# Proposal

## Why

El proyecto pasa a su nombre definitivo, **CasterFly**, con `casterfly.com` como sitio público y `panel.casterfly.com` como panel. Hoy el dominio, el TLS, los enlaces absolutos, los correos y la PWA siguen atados a `panelipstream.cl` / `ipstream.cl`: `casterfly.com` ya apunta al VPS del panel pero su TLS falla porque cae en el catch-all de sitios de clientes, y el bundle de la PWA sigue llamando al panel viejo.

## What Changes

- **Nuevo mapa de hosts**: `casterfly.com` sirve el sitio público, `panel.casterfly.com` el panel y las APIs, `stream.casterfly.com` Icecast, y `*.casterfly.com` los sitios de clientes. `www.casterfly.com` redirige al root.
- **Caddy con dominios separados**: dejar de usar `STREAM_DOMAIN` como dominio del panel. Nuevas variables `PUBLIC_DOMAIN`, `PANEL_DOMAIN` y `STREAM_DOMAIN`, cada una con su bloque explícito; el catch-all queda solo para sitios de clientes.
- **Sitio público en el VPS del panel**: el stack PHP/MySQL de `ipstreamsitio` se despliega como contenedor vecino y Caddy lo sirve en `casterfly.com`. Es un cambio coordinado en el repo del sitio público; este change cubre la integración de infraestructura y la verificación desde el panel.
- **Compatibilidad de dominios viejos**: `panelipstream.cl` redirige al panel nuevo, pero `/api/*` sigue proxeado para las PWA ya instaladas; `stream.panelipstream.cl` sigue proxeando a Icecast; `*.ipstream.cl` sigue sirviendo a los clientes actuales.
- **Base de sitios de clientes**: `CLIENT_SITES_DOMAIN=casterfly.com` y `CLIENT_SITES_TARGET=clientes.casterfly.com`. Los dominios existentes `label.ipstream.cl` quedan como alias y se agrega `label.casterfly.com` como primario.
- **PWA**: el bundle único resuelve la API contra `panel.casterfly.com` (o el mismo origen) y el service worker cachea el host correcto. Se republica el bundle.
- **Datos y configuración**: `app_config.clientSitesDomain`/`clientSitesTarget`, `streaming_servers.publicHostname`/`publicUrl`, `BasicData.websiteUrl` y los `client_domains` se actualizan. La DB sigue teniendo prioridad sobre el env.
- **Marca visible**: logo CasterFly (SVG horizontal + isotipo) en panel, login, PWA, correos y PDFs; se mantiene la paleta actual celeste/azul. Se actualizan títulos, links públicos y textos de soporte.
- **Externos y nodos**: Resend, PayPal, OneSignal y el token de Cloudflare se reconfiguran. Los nodos remotos reciben el origen CORS y el host de DB nuevos.
- **BREAKING**: `NEXTAUTH_URL` cambia de host; las sesiones existentes no se comparten con el dominio viejo y los usuarios deben iniciar sesión de nuevo.

## Capabilities

### New Capabilities

- `platform/host-routing`: ruteo por host del sitio público, panel, stream y sitios de clientes, con redirects de dominios legacy y autorización TLS acotada.
- `client-sites/casterfly-domains`: dominio base `casterfly.com`, migración de dominios de clientes a `label.casterfly.com`, alias de los hosts viejos y origen de API de la PWA.
- `platform/brand-identity`: identidad visible CasterFly (nombre, logo, metadatos, links absolutos, correos y PDFs) sin cambiar la paleta celeste/azul actual.

### Modified Capabilities

<!-- No se modifican specs existentes en openspec/specs/: las capacidades de sitios
     de clientes viven todavía en changes sin archivar. Se introducen capacidades
     nuevas con el comportamiento de la migración para no pisar esos deltas. -->

## Impact

- **Infraestructura**: DNS de Cloudflare (panel, stream, www, wildcard), Caddy del panel, stack PHP/MySQL del sitio público, TLS on-demand para sitios de clientes.
- **Panel**: `deploy/Caddyfile`, `deploy/.env.prod.example`, `deploy/scripts/deploy.sh`, `deploy/scripts/cron-push.sh`, `deploy/docker-compose.prod.yml`, `docker-compose.yml`, `next.config.js`, `middleware.ts` (solo si el sitio público termina servido por Next), `lib/*` con fallbacks de URL, `components/admin/*`, `app/registro`, `app/planes/[slug]`.
- **PWA**: `pwa/src/core/config/tenant.ts`, `pwa/src/sw.ts`, tests, workflow `deploy-site-bundle.yml` y bundle publicado.
- **Base de datos**: `app_config`, `client_domains`, `streaming_servers`, `BasicData`.
- **Sistemas externos**: Resend (dominio verificado), PayPal (return/webhook), OneSignal (webhook por cliente), Cloudflare (zona `casterfly.com`), nodos de streaming remotos (CORS y DB host).
- **Repo coordinado**: `ipstreamsitio` (sitio público) con su propio change `casterfly-public-site`.
