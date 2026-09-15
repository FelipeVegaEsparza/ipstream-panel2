## Why

Los reproductores PWA de cada radio necesitan leer el audio del stream con Web Audio (VU meter / visualizador que sigue la música) y consumir el HLS de TV cross-origin. Sin CORS en las respuestas de los streams, el navegador no puede acceder a los datos del audio ni reproducir el video desde los sitios de los clientes. Las respuestas de Icecast (audio), de SRS (HLS) y de los proxies Caddy no enviaban `Access-Control-Allow-Origin`, rompiendo ese consumo.

## What Changes

- **Icecast (audio)** — se agrega `<http-headers>` global con `Access-Control-Allow-Origin: *` (y headers de métodos/expose para `Icy-MetaData`) tanto en la config generada por el agente (per-mount) como en el template base del contenedor. Aplica a las respuestas GET de cualquier mount.
- **Caddy del panel (`deploy/Caddyfile`)** — los bloques `/live/*` y `/dj/*` (HLS de TV) ahora envían CORS. El bloque `stream.*` (audio) ya lo tenía.
- **Nodos** — `deploy/Caddyfile.node` y el Caddyfile que genera `lib/node-provisioner.ts` ahora envían CORS en las respuestas de audio. SRS (video) ya envía CORS ante requests con header `Origin`, cubierto sin cambios.
- **Despliegue** — el header de audio sale de Icecast mismo, así que aplica tanto vía Caddy como accediendo directo al puerto de Icecast en cada nodo.

## Capabilities

### New Capabilities

- `streaming/cors-delivery`: headers CORS en las respuestas de streaming (audio Icecast y video HLS SRS) para permitir que los reproductores/sitios web de los clientes consuman los streams cross-origin desde el navegador.

### Modified Capabilities

- Ninguna: no existe spec previa que gobierne los headers de entrega de streaming; el comportamiento nuevo queda en la capacidad `streaming/cors-delivery`.

## Impact

- **Agente** (`streaming/agent/lib/icecast-config.js`): el XML que genera y deploya a Icecast ahora incluye `<http-headers>` con CORS.
- **Imagen Icecast** (`streaming/icecast/icecast.xml`): template con `<http-headers>` para builds nuevos.
- **Caddy panel** (`deploy/Caddyfile`): CORS en `/live/*` y `/dj/*`.
- **Nodos** (`deploy/Caddyfile.node`, `lib/node-provisioner.ts`): Caddyfile generado con CORS para audio.
- **Deploy**: toca `streaming/agent/*` y `lib/node-provisioner.ts` → tras el deploy hay que pulsar **"Actualizar nodo"** en cada nodo remoto (`/admin/servers`); Caddy del panel se reinicia solo en el deploy.
