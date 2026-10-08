# Tasks

## 1. Fase A — Registro y resolución de dominios (panel)

- [x] 1.1 Agregar el modelo `ClientDomain` y la relación en `Client` (`prisma/schema.prisma`); verificar con `npx prisma validate` y `npx prisma generate`.
- [x] 1.2 Implementar `GET /api/public/resolve-domain?host=` con normalización de host (lowercase, sin puerto/punto final, soporte `www.`/etiqueta de subdominio) y caché TTL; verificar con tests/HTTP que resuelve, no encuentra, y normaliza.
- [x] 1.3 UI de administración para registrar/listar dominios de un cliente (subdominio/custom), marcar primario y mostrar estado; verificar alta y lectura en `/admin`.
- [x] 1.4 Job/seed de migración de los clientes actuales a `ClientDomain` (o herramienta manual) y verificar que un cliente existente queda con su dominio.

## 2. Fase B — Shell dinámico por host (panel + bundle único)

- [x] 2.1 Construir `pwa/dist` y publicarlo en el runtime del panel (mount/volumen) y servir sus assets estáticos (`/assets/*`, `/sw.js`, `/offline.html`); verificar que un asset responde con caché desde un dominio de cliente.
- [x] 2.2 Servir `manifest.webmanifest` dinámico por host (nombre, short_name, theme, iconos); verificar en un dominio de cliente.
- [x] 2.3 Servir `index.html` con OG/Twitter del cliente inyectados en server; verificar `<title>`/`og:image` correctos y degradación sin imagen.
- [x] 2.4 Servir iconos por host (`favicon.png`, `icon-192/512`, `maskable`, `apple-touch-icon`) con fallback a los compartidos; verificar con y sin iconos.
- [x] 2.5 Fallback de SPA para rutas internas (p. ej. `/noticias/123`) y página informativa para host sin cliente; verificar ambos.
- [x] 2.6 Detección de host de cliente vs host del panel en `middleware.ts`; verificar que el panel y `stream.*` no se ven afectados.

## 3. Fase C — Tenant runtime en la PWA

- [ ] 3.1 Resolver el tenant en runtime por host en `TenantProvider` (asíncrono), con fallback al `clientId` horneado y estado `notFound`; verificar con tests (host resuelto, fallback, sin tenant).
- [ ] 3.2 Hacer configurable la base de la API (eliminar `IPSTREAM_BASE` hardcodeado) y verificar same-origin y origen distinto en tests.
- [ ] 3.3 Cargar templates de forma diferida (`React.lazy` + `Suspense`) con `ErrorBoundary` que cae al template por defecto; verificar con tests (template conocido, desconocido, error de carga).

## 4. Fase D — Provisión de dominios y TLS

- [ ] 4.1 Abstracción de proveedor DNS (Cloudflare) con env (`CLOUDFLARE_API_TOKEN`, `CLIENT_SITES_DOMAIN`, `CLIENT_SITES_TARGET`); verificar creación de registro con un dominio de prueba.
- [ ] 4.2 Job en background de provisión de subdominio (patrón `node-provisioner.ts`) con `provisionStatus`/`provisionLog`; verificar éxito, reintento y falla legible.
- [ ] 4.3 Verificación de dominio custom por CNAME con reintento y transición a `active`; verificar caso correcto y ausente.
- [ ] 4.4 Endpoint `ask` de TLS + configuración de Caddy on-demand; verificar que autoriza dominios `active` y rechaza los demás.

## 5. Fase E — Retiro y documentación

- [ ] 5.1 Deprecar `build-client.mjs`/`new-client.mjs` como flujo de producción (dejarlos para dev/marca) y documentarlo en `pwa/docs`.
- [ ] 5.2 Actualizar `AGENTS.md` y docs de deploy con el modelo de bundle único + dominios; verificar que el texto coincide con lo implementado.
- [ ] 5.3 Verificación end-to-end: un cliente accesible por su dominio, servido por el bundle único, con branding/OG/manifest correctos y sin deploy por cliente.
