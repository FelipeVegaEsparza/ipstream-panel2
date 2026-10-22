# Design

## Context

Ver `proposal.md` para la motivación. El estado actual que condiciona el diseño:

- `deploy/Caddyfile` usa `{$STREAM_DOMAIN}` como dominio del **panel** y deriva de ahí `stream.{$STREAM_DOMAIN}`. Cambiar `STREAM_DOMAIN` a `panel.casterfly.com` produciría `stream.panel.casterfly.com`.
- El bloque catch-all `:443` con `X-Tenant-Site: 1` atiende cualquier host no listado. `casterfly.com` cae ahí hoy y el `on_demand_tls ask` rechaza el certificado.
- El sitio público es otra aplicación (PHP/MySQL) en `212.47.73.143`, con su propia DB y volumen de uploads, y enlaza al panel viejo en 63 lugares.
- La PWA tiene `DEFAULT_API_ORIGIN=https://panelipstream.cl` y el service worker cachea ese host.
- `app_config` tiene prioridad sobre el env para el dominio base de clientes.
- No hay clientes reales: se puede hacer cutover directo, sin convivencia prolongada.

## Goals / Non-Goals

**Goals:**

- Un mapa de hosts explícito y estable: público, panel, stream y sitios de clientes.
- Migrar el sitio público al VPS del panel sin reescribirlo.
- Mantener operativas las URLs antiguas que puedan estar guardadas (PWA instaladas, audio, enlaces).
- Dejar la configuración de dominios en un solo lugar efectivo y documentado.
- Reemplazar la marca visible sin tocar la paleta ni la infraestructura interna.

**Non-Goals:**

- Reescribir el sitio público en Next.js.
- Renombrar contenedores, redes, volúmenes, base de datos o repositorio (`ipstream-*` se conserva).
- Rediseñar la paleta o el sistema visual del panel.
- Migrar clientes/leads/órdenes del sitio público viejo; solo se conservan uploads y se recrea el contenido.
- Implementar alta disponibilidad o cero downtime.

## Decisions

### 1. Separar dominios en Caddy en lugar de derivarlos

`STREAM_DOMAIN` deja de ser el dominio del panel. Se introducen tres variables independientes:

- `PUBLIC_DOMAIN=casterfly.com`
- `PANEL_DOMAIN=panel.casterfly.com`
- `STREAM_DOMAIN=stream.casterfly.com`

Cada una tiene su bloque explícito y `www` redirige al root. El catch-all queda exclusivamente para sitios de clientes.

**Alternativa descartada:** mantener una sola variable y derivar `panel.`/`stream.`. Se descarta porque impide que el stream viva en `stream.casterfly.com` y acopla tres servicios a un solo nombre.

### 2. Sitio público como contenedor vecino, con MySQL propio

El stack del sitio público se despliega en el VPS del panel como `site` + `site-db` (nombres internos nuevos, sin renombrar lo existente). Solo `site` se conecta a la red que ve Caddy; `site-db` queda aislada en su red interna. Caddy hace `reverse_proxy site:80`.

Se conserva su MySQL separado porque su esquema (`plans`, `news`, `tutorials`, `orders`, `landing_leads`, etc.) no es el del panel. Se migran uploads y se recrea el contenido, según la decisión del usuario.

**Alternativas descartadas:**

- Reescribir el sitio público como rutas de Next: mucho más trabajo y pierde la implementación actual.
- Mantener el sitio en su VPS y proxear desde Caddy: agrega un hop y acopla dos servidores.
- Apuntar `casterfly.com` al VPS del sitio: contradice la decisión de unificar y obliga a mover el DNS del root.

### 3. Compatibilidad legacy selectiva

- `panelipstream.cl`: las páginas se redirigen con `308` a `panel.casterfly.com`; `/api/*` se mantiene proxeado al panel para no romper PWA instaladas ni convertir POST en GET.
- `stream.panelipstream.cl`: se mantiene proxeado a Icecast; no se redirige para no romper reproductores.
- `*.ipstream.cl`: siguen resolviendo a sus clientes actuales; los hosts nuevos `*.casterfly.com` se agregan como primarios.

**Alternativa descartada:** redirigir todo con `301`. Rompe PWA instaladas y clientes de audio que no siguen redirecciones.

### 4. PWA same-origin en producción

El bundle de producción se construye con `VITE_API_BASE=''`, de modo que la API pública se consume desde el mismo host del sitio del cliente (el catch-all ya enruta `/api/*` al panel). El fallback de desarrollo sigue siendo `https://panel.casterfly.com`. El service worker cachea la API solo cuando el origen coincide con `self.location.origin` (o con el origen configurado), no con `panelipstream.cl`.

**Alternativa descartada:** mantener llamadas cross-origin a `panel.casterfly.com`. Funciona por CORS, pero agrega dependencia del host del panel en cada sitio y obliga a actualizar el service worker con un host fijo.

### 5. Migración de dominios idempotente

Para cada `client_domains` con `kind='subdomain'` y host `label.ipstream.cl`:

1. Calcular `label.casterfly.com`.
2. Crear la fila nueva si no existe, `active` y `isPrimary=true`.
3. Dejar la fila vieja `active` como alias, `isPrimary=false`.
4. Actualizar `BasicData.websiteUrl` solo si apuntaba al host viejo.

El script debe poder correrse dos veces sin duplicar. Los dominios `custom` no se tocan.

**Alternativa descartada:** reescribir `hostname` en la fila existente. Rompe enlaces viejos y no permite el alias.

### 6. Una sola fuente de verdad para el dominio base

La configuración efectiva sale de `app_config` con fallback a env. El script de migración actualiza `app_config.clientSitesDomain` y `clientSitesTarget`; no alcanza con cambiar `.env`. El panel de admin sigue siendo la vía normal para editarlo.

### 7. Server Actions con allowlist explícita

`next.config.js` se actualiza para aceptar `panel.casterfly.com` y `panelipstream.cl` además de localhost, sin depender de que `PANEL_PUBLIC_URL` exista en el build de Docker. La env se sigue pasando en runtime para el resto del panel.

**Alternativa descartada:** confiar solo en `PANEL_PUBLIC_URL` en build. Hoy no se pasa como build arg y el fallback quedaría viejo.

### 8. Nodos remotos: actualizar entorno, no código

No se toca el agente ni su Caddyfile. Se cambia el entorno que el panel escribe al reaprovisionar:

- `CORS_ALLOWED_ORIGINS` incluye `https://panel.casterfly.com` y `https://panelipstream.cl`.
- `DB_HOST`/`MYSQL_HOST` pasan a `panel.casterfly.com` cuando se actualice el nodo.
- `PANEL_PUBLIC_HOST=panel.casterfly.com` en el panel.

Los nodos existentes deben pulsar **"Actualizar nodo"** o editar su `.env`; hasta entonces el dominio viejo debe seguir resolviendo y el origen viejo debe seguir permitido.

### 9. Marca: assets nuevos, tokens actuales

Se usan `logo2.svg` (horizontal) y `fav.svg` (isotipo), con PNG derivados para OG, correos y PWA. No se modifican `--brand-*` ni `--brand-grad`. Los nombres internos (`logo-ipstream.png` como fallback, contenedores `ipstream-*`) se conservan; solo se reemplaza el contenido visible y se actualizan los textos.

### 10. Sitio público: cutover directo

Como no hay clientes reales, no se monta una convivencia larga. El orden es: desplegar el stack nuevo, copiar uploads, levantar Caddy con el bloque `casterfly.com`, verificar con `curl --resolve`, y recién entonces actualizar enlaces/marca. El sitio viejo en `ipstream.cl` puede quedar como respaldo y luego redirigir al nuevo.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Las PWA instaladas siguen llamando a `panelipstream.cl/api/*` | Mantener `/api/*` proxeado en el host viejo hasta que el bundle nuevo esté desplegado y actualizado. |
| Los nodos remotos pierden DB o CORS con el dominio nuevo | Mantener DNS viejo, incluir ambos orígenes en CORS y actualizar cada nodo antes de retirar el host viejo. |
| `app_config` pisa el env y deja el dominio base viejo | Actualizar la DB en el mismo despliegue y verificar la configuración efectiva antes de probar altas. |
| El certificado de `casterfly.com` sigue fallando | Agregar el bloque explícito antes de probar; verificar que el `ask` no intervenga para hosts de plataforma. |
| Cloudflare proxeado interfiere con TLS/WebRTC/DB | Mantener los hosts de panel/stream en DNS-only o verificar los puertos; no proxear el 8010 ni el 3307. |
| Resend rechaza correos por dominio no verificado | Verificar `casterfly.com` en Resend y usar `no-reply@casterfly.com` solo después. |
| PayPal/OneSignal siguen apuntando al host viejo | Actualizar la configuración externa antes de retirar el host viejo. |
| El repo del sitio público tiene cambios sin commitear y HTML construido | Resolver el estado de git, hacer reemplazos dirigidos y revisar el diff antes de desplegar. |
| El logo nuevo no se ve bien en tema claro/oscuro | Usar la variante SVG con color de marca y probar ambos temas; el PNG transparente para OG. |

## Migration Plan

1. **Backups**: DB del panel, DB del sitio público, uploads, `.env`, Caddyfile, configuración de Cloudflare.
2. **DNS**: agregar `panel`, `stream`, `www` y wildcard `*.casterfly.com`; no quitar los registros viejos.
3. **Panel**: desplegar Caddy con bloques nuevos y envs nuevas; dejar `panelipstream.cl` redirigiendo/proxeando. Verificar TLS, login, Server Actions, registro y correos.
4. **Sitio público**: desplegar `site` + `site-db` en el VPS del panel, copiar uploads, configurar `SITE_URL` y Flow; levantar el bloque `casterfly.com`; probar con `curl --resolve`.
5. **Contenido y enlaces**: recrear planes/noticias/tutoriales, actualizar links a `panel.casterfly.com`, marca y canonical.
6. **Datos del panel**: correr la migración de `app_config`, `streaming_servers` y `client_domains`; republicar la PWA.
7. **Externos y nodos**: Resend, PayPal, OneSignal, token de Cloudflare; actualizar nodos remotos.
8. **Retiro**: cuando todo esté verificado, redirigir `ipstream.cl` a `casterfly.com` y evaluar el retiro de `stream.panelipstream.cl` y de los `*.ipstream.cl`.

**Rollback**: mantener el Caddyfile anterior y los envs viejos en un archivo de respaldo; si falla el panel nuevo, restaurar el bloque del panel viejo y el DNS. El stack del sitio público viejo sigue disponible hasta el retiro.

## Open Questions

- ¿El sitio público viejo corre con Dokploy, Docker Compose plano u otro orquestador? Se puede descubrir por SSH durante la implementación y no cambia el enfoque.
- ¿Cuál es el tamaño real de la DB y de uploads? Solo afecta la ventana de copia.
