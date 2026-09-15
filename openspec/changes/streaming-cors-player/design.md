## Context

See proposal.md — Why. Los streams se sirven desde Icecast (audio, puerto 8000), SRS (video HLS, puerto 8080) y proxies Caddy por delante (panel y nodos). La verificación en producción mostró: SRS ya respondía `Access-Control-Allow-Origin: *` ante requests con header `Origin` (config `crossdomain on` por defecto), pero Icecast no enviaba CORS en absoluto, y los bloques `/live/*` y `/dj/*` del Caddy del panel no lo agregaban.

## Goals / Non-Goals

**Goals:**
- Que las respuestas de audio (Icecast) incluyan CORS en cualquier topología: acceso directo al puerto de Icecast, vía Caddy del panel (`stream.*`) o vía Caddy de nodo.
- Que el HLS de TV (SRS) tenga CORS asegurado también cuando pasa por Caddy del panel.
- Config idéntica en todos los nodos (el agente genera su propio `icecast.xml`).

**Non-Goals:**
- Restringir CORS a orígenes específicos (se usa `*`: los streams son públicos).
- Cambiar el comportamiento de autenticación o control de los streams.

## Decisions

### 1. CORS en Icecast via `<http-headers>` global
Icecast 2.4.4 soporta `<http-headers>` a nivel raíz, que aplica a todas las respuestas (incluidos los streams). Se agrega en los dos lugares donde se genera config de Icecast:
- `generateIcecastXml()` en `streaming/agent/lib/icecast-config.js` (config con per-mount que el agente deploya a cada Icecast en cada arranque y ante cambios de streams).
- Template base `streaming/icecast/icecast.xml` (para builds nuevos del contenedor).

Headers: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Origin, Accept, Icy-MetaData, Range`, `Access-Control-Allow-Methods: GET, OPTIONS`, `Access-Control-Expose-Headers: Content-Length, Content-Type, Icy-Br, Icy-MetaInt, Icy-MetaData`.
- **Alternativa**: agregar CORS solo en el Caddy del panel → descartada: los nodos sirven Icecast directo en :8000 y cada nodo tiene su propio Caddy; el fix en Icecast cubre todos los casos con un solo cambio.

### 2. CORS en Caddy del panel para HLS
El Caddyfile de producción (`deploy/Caddyfile`) proxea `/live/*` y `/dj/*` a SRS:8080. Se agrega un bloque `header` con CORS en ambos `handle`, de modo que no se dependa solo del `crossdomain` de SRS (que ya responde CORS con `Origin`, pero el refuerzo en Caddy lo garantiza incluso si SRS cambia).
- El bloque `stream.*` (audio por HTTPS) ya tenía CORS; no se modifica.

### 3. CORS en Caddy de nodos
`deploy/Caddyfile.node` (referencia) y el `CADDYFILE` embebido en `lib/node-provisioner.ts` (lo que el panel escribe en cada nodo al provisionar o actualizar) se actualizan con el mismo bloque `header` que el Caddyfile del panel para audio. SRS en nodos sigue cubierto por su `crossdomain`.

### 4. Sin cambios en SRS
SRS 5 ya incluye `crossdomain on` por defecto (`http_server`), verificado en producción: responde `Access-Control-Allow-Origin: *` cuando la request trae `Origin`. No se requiere tocar `srs.conf`.

## Risks / Trade-offs

- **`*` en CORS** → [Riesgo] cualquier sitio puede reproducir el stream (hotlinking). Mitigación: los streams ya son públicos por diseño (URLs sin token); aceptado.
- **Icecast no recarga config automáticamente** → [Riesgo] el `icecast.xml` se deploya al arrancar el agente y al deployar config; un cambio no se aplica hasta que el agente regenera/reload. Mitigación: el deploy actual reinicia Caddy y el agente redeploya la config de Icecast al arrancar.
- **Nodos desactualizados** → [Riesgo] los nodos no se auto-actualizan. Mitigación: pulsar **"Actualizar nodo"** en `/admin/servers` tras el deploy para que tomen el Caddyfile nuevo y el agente/icecast nuevo.

## Migration Plan

1. Desplegar el cambio (GitHub Actions) → el panel y el agente del VPS principal se actualizan; Caddy del panel se reinicia (toma `/live/*` y `/dj/*` con CORS) y el agente redeploya la config de Icecast con `<http-headers>`.
2. Pulsar **"Actualizar nodo"** en `/admin/servers` para cada nodo remoto (Caddyfile de nodo + Icecast).
3. Verificar con curl: `curl -sI -H 'Origin: https://cliente.cl' <streamUrl>` debe mostrar `Access-Control-Allow-Origin: *` en audio y HLS.

## Open Questions

- Ninguna: el alcance (audio + video, `*`), la ubicación del header (Icecast + Caddy) y el despliegue quedaron fijados.
