# Tasks

## 1. Infra y esquema

- [x] 1.1 Agregar a `docker-compose.streaming.yml` el volumen `./data/video:/var/lib/video` en el servicio `agent` y las envs `MAX_VIDEO_UPLOAD_MB` (default 2048) y `FFMPEG_TIMEOUT_MS`; verificar con `docker compose -f docker-compose.streaming.yml config` que el volumen y las envs aparecen.
- [x] 1.2 Agregar migración idempotente en `streaming/agent/server.js`: columnas `status` (`VARCHAR`, default `'ready'`) y `processingError` (`VARCHAR/TEXT`, nullable) en `video_tracks`, con guardas para no fallar si ya existen; verificar levantando el agente y consultando `SHOW COLUMNS FROM video_tracks`.
- [x] 1.3 Actualizar `prisma/schema.prisma` (modelo `VideoTrack`) con `status` y `processingError`; verificar con `npx prisma validate` y `npx prisma generate`.

## 2. Agente: subida en streaming

- [x] 2.1 Reemplazar `data.toBuffer()` por streaming directo a disco (`pipeline(data.file, fs.createWriteStream(dest))`) sobre el volumen compartido en `routes/video.js`, eliminando `/tmp` + `docker cp`; verificar subiendo un archivo y comprobando que aparece en `./data/video/user_<clientId>/` y que no se crea archivo en `/tmp`.
- [x] 2.2 Hacer configurables los límites en `server.js` (`bodyLimit` y multipart `fileSize` desde `MAX_VIDEO_UPLOAD_MB`) y devolver un error 413 con mensaje claro al superar el máximo; verificar subiendo un archivo mayor al límite y con `curl` comprobando status 413 y el mensaje.
- [x] 2.3 Verificar que una subida grande no escala la memoria del agente (observar RSS con `docker stats ipstream-streaming-agent` durante una subida de ~1 GB, comparado con una subida chica).

## 3. Agente: normalización en background

- [x] 3.1 Corregir `execCmd` en `lib/video-encoder.js` para no forzar `timeout: 30000` en ffmpeg (usar `FFMPEG_TIMEOUT_MS` configurable) manteniendo timeout corto en comandos rápidos; verificar normalizando un video que tarde más de 30s sin que el proceso muera.
- [x] 3.2 Implementar un runner de jobs in-process (concurrencia 1 por nodo) que procese la normalización: `pending` → `processing` → `ready`/`error`, actualizando metadatos y `processingError`; verificar subiendo un video no canónico y observando las transiciones de `status` en `video_tracks`.
- [x] 3.3 Insertar el track con `status='pending'` y responder la subida sin esperar la normalización; verificar que el POST de subida responde antes de que termine ffmpeg.
- [x] 3.4 Filtrar `resolvePlaylistEntries` (y el armado de playlist del encoder) para incluir solo tracks `ready`; verificar que un track en `processing`/`error` no se reproduce en el AutoDJ.

## 4. Panel: proxy en streaming y estado

- [x] 4.1 Cambiar `app/api/dashboard/television/[...params]/route.ts` para pasar `req.body` en streaming al agente en vez de `req.blob()`, reenviando `Content-Type` y `Content-Length`; verificar con una subida de ~1 GB que la memoria del panel no crece y la request finaliza.
- [x] 4.2 Agregar pre-chequeo de `Content-Length`/`file.size` en el panel con rechazo temprano 413 y mensaje con el máximo; verificar subiendo un archivo sobredimensionado y comprobando el 413 inmediato.
- [x] 4.3 Exponer el estado de procesamiento del/los tracks al frontend (campo `status`/`processingError` en el listado de tracks o endpoint dedicado); verificar que el JSON de `GET /api/dashboard/television/tracks` incluye el estado.

## 5. UI: cola de subida con progreso y fase de procesamiento

- [x] 5.1 Generalizar `components/dashboard/streaming/LibraryUploader.tsx` a un componente reutilizable (`accept`, endpoint, URL de estado) sin romper la sección de audio; verificar que la subida de audio sigue funcionando con su cola y progreso.
- [x] 5.2 Integrar el componente en `app/dashboard/television/library/page.tsx` con `accept="video/*"`, progreso por XHR y barra total; verificar subiendo varios videos y observando el progreso por archivo y total.
- [x] 5.3 Agregar la fase `procesando` con polling de estado hasta `ready`/`error`, mostrando badge y mensaje de error por archivo; verificar que un video no canónico muestra "procesando" y luego "completado", y que un fallo se marca sin frenar la cola.

## 6. Integración y deploy

- [x] 6.1 Ejecutar `npm run lint` y `npm run build` y verificar que pasan sin errores.
- [ ] 6.2 Prueba end-to-end en el VPS principal: subir un video de ~1 GB por la sección TV, verificar progreso, normalización, reproducción en AutoDJ y que un archivo mayor al máximo se rechaza con mensaje claro.
- [ ] 6.3 Verificar el `server.requestTimeout` del panel con una subida lenta; si se corta a los 5 min, implementar el custom server con `requestTimeout` desactivado para la ruta de subida.
- [x] 6.4 Documentar en `AGENTS.md` / README del deploy las nuevas envs y recordar pulsar "Actualizar nodo" en los nodos remotos; verificar que la nota aparece en la documentación.
