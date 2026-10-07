# Tasks

## 1. Configuración y esquema

- [x] 1.1 Agregar en `streaming/agent/lib/config.js` la env `TV_VIDEO_LADDER` (default `1080p:2000,720p:1000`), parseada a un array `[{name,bitrateKbps,width,height}]`; verificar que el default se interpreta correctamente (log/arranque del agente).
- [x] 1.2 Exponer `TV_VIDEO_LADDER` en `docker-compose.yml` y `docker-compose.streaming.yml` y documentar el ladder en `AGENTS.md`; verificar que el contenedor del agente recibe la variable.
- [x] 1.3 Agregar en `streaming/agent/server.js` una migración idempotente que asegure la columna `renditions` (JSON, nullable) en `video_tracks`; verificar que el agente arranca sin error y la columna existe.

## 2. Empaquetado (packager)

- [x] 2.1 Refactorizar `streaming/agent/lib/video-packager.js` para empaquetar cada rendición en `hls/<clientId>/<trackId>/<rendition>/`; verificar con un video de prueba que se generan ambas subcarpetas con `index.m3u8` y segmentos de 2 s alineados.
- [x] 2.2 Actualizar `streaming/agent/lib/video-normalize-queue.js` para guardar `hlsPath` (directorio del track) y `renditions` (JSON con las variantes); verificar en DB que un track nuevo tiene `renditions` con 1080p y 720p.
- [x] 2.3 Mantener el fast-path por rendición (copy si la fuente ya cumple) y no-upscale; verificar con una fuente 720p que la rendición 1080p no se genera por upscale.

## 3. Stitcher multi-rendición

- [x] 3.1 Armar el ciclo desde la rendición de referencia y mapear segmentos por índice entre rendiciones; cubrir con un test unitario de `channel-stitcher` el mapeo por índice.
- [x] 3.2 Generar `master.m3u8` con `#EXT-X-STREAM-INF` (RESOLUTION y BANDWIDTH) por rendición; verificar el contenido del master con un test/curl.
- [x] 3.3 Servir el manifiesto vivo por rendición en `live/<rendition>.m3u8`; verificar con curl que cada variante lista segmentos.
- [x] 3.4 Implementar la intersección de rendiciones del ciclo (excluir rendiciones con conteo distinto o tracks legados); verificar con un ciclo mixto que el master colapsa a la rendición común.
- [x] 3.5 Compatibilidad hacia atrás: un track single-rendition se expone como variante única; verificar reproducción de un track legado.

## 4. Rutas del panel

- [x] 4.1 Ajustar `app/vod/[key]/live.m3u8` (master) y agregar `live/[rendition].m3u8` y `seg/[rendition]/[track]/[file]`; verificar el proxy al agente, CORS y reescritura de URIs.
- [x] 4.2 Hacer que `/tv/<key>.m3u8` (panel y agente) redirija al master; verificar la redirección 302.
- [x] 4.3 Verificar headers: manifiestos `no-store`, segmentos `immutable`; confirmar que Cloudflare cachea `.ts` y no los manifiestos.

## 5. Players

- [x] 5.1 Actualizar el player del dashboard (`app/dashboard/television/page.tsx`) y los `/tv` (agente `routes/tv.js` y panel `app/tv/[key]/route.ts`) para consumir el master; verificar ABR automático en el navegador.
- [x] 5.2 Ajustar la lógica de probe/recuperación (hoy busca `#EXT-X-ENDLIST` en un manifiesto con segmentos) para operar sobre el master/variantes; verificar la reconexión ante corte.

## 6. Scripts

- [x] 6.1 Actualizar `streaming/agent/scripts/package-videos.js` para empaquetar el ladder; verificar con `--force` sobre un track de prueba que se generan ambas rendiciones.

## 7. Verificación de integración

- [x] 7.1 End-to-end en un nodo de prueba: subir un video nuevo, verificar `master.m3u8` + 2 rendiciones + reproducción ABR, y cache correcta en Cloudflare (`cf-cache-status: HIT` en `.ts`); documentar el resultado.
