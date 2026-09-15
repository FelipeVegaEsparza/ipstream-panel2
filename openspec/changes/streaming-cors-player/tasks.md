## 1. Icecast — CORS en audio

- [x] 1.1 Agregar `<http-headers>` global con CORS en `streaming/agent/lib/icecast-config.js` (`generateIcecastXml`). Verificar con `node --check` y que el XML generado incluye `Access-Control-Allow-Origin`.
- [x] 1.2 Agregar `<http-headers>` equivalente en el template `streaming/icecast/icecast.xml`. Verificar que el XML parsea (xml.etree) y contiene los headers CORS.

## 2. Caddy — CORS en HLS y nodos

- [x] 2.1 Agregar bloque `header` con CORS en los `handle /live/*` y `/dj/*` de `deploy/Caddyfile`. Verificar que el Caddyfile incluye `Access-Control-Allow-Origin "*"` en ambos bloques.
- [x] 2.2 Agregar CORS en `deploy/Caddyfile.node`. Verificar que el archivo incluye el bloque `header`.
- [x] 2.3 Agregar CORS en el `CADDYFILE` embebido de `lib/node-provisioner.ts`. Verificar que el template generado para nodos incluye `Access-Control-Allow-Origin "*"`.

## 3. Verificación en producción

- [x] 3.1 Verificar que SRS ya responde CORS ante requests con `Origin` (no requiere cambio). Confirmado con `curl -sI -H 'Origin: https://cliente.cl' http://localhost:8080/live/<key>.m3u8`.
- [ ] 3.2 Tras el deploy, verificar con curl que los streams de audio responden `Access-Control-Allow-Origin: *` (acceso directo a Icecast y vía Caddy del panel/nodo).
- [ ] 3.3 Pulsar **"Actualizar nodo"** en `/admin/servers` para cada nodo remoto y reverificar CORS de audio en un nodo.
