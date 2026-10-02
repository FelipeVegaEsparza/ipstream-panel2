# Proposal: Subida de archivos grandes de TV (cola y progreso)

## Why

La subida de videos en la sección Televisión no funciona con archivos grandes (hasta ~1 GB): el agente Fastify corta en 50 MB (`streaming/agent/server.js`), el panel buffea el archivo completo en memoria (`req.blob()`) y la request queda colgada mientras ffmpeg normaliza. El resultado es que el operador no ve ningún error ni progreso: la subida simplemente "no hace nada". La sección de audio ya resuelve esto con `LibraryUploader` (cola + progreso por XHR), pero TV usa `fetch` sin feedback.

## What Changes

- Subir videos de TV de hasta un máximo configurable (default 2 GB) transmitiendo los bytes en streaming de extremo a extremo, sin buffering en memoria en el panel ni en el agente.
- Límites de subida configurables por entorno (`MAX_VIDEO_UPLOAD_MB`), aplicados tanto en el panel como en el `bodyLimit`/multipart del agente.
- Escribir el archivo directamente en el volumen `./data/video` compartido con `video-encoder`, eliminando la copia temporal y el `docker cp`.
- Mover la normalización de video a un job en background con estado del track (`pending` → `processing` → `ready`/`error`), en vez de bloquear la respuesta HTTP.
- Cola de subida en la UI de TV con progreso real (XHR `upload.onprogress`), fase de subida y fase de procesamiento, estados por archivo y total — reutilizando/generalizando `LibraryUploader`.
- Corregir el timeout de `execCmd` (30s fijos) que hoy mata la normalización de videos largos.
- Verificar y ajustar el `server.requestTimeout` del panel (Node 20, default 5 min) para subidas pesadas.

## Capabilities

### New Capabilities

- `television/large-file-upload`: subida de videos de TV de gran tamaño por streaming, con máximo configurable, cola de subida con progreso y feedback de las fases de subida y procesamiento.

### Modified Capabilities

- `television/video-normalization`: la normalización deja de ser síncrona dentro de la request de subida; pasa a ejecutarse en background y el track expone un estado de procesamiento (`pending` → `processing` → `ready`/`error`).

## Impact

- **Agente** (`streaming/agent`): `routes/video.js` (streaming multipart a disco en vez de `toBuffer()`), `server.js` (límites configurables), `lib/video-encoder.js` (`execCmd` timeout, normalización como job), `docker-compose.streaming.yml` (volumen compartido `./data/video` con el agente).
- **Panel** (`app/api/dashboard/television/[...params]/route.ts`): pasar `req.body` en streaming al agente en vez de `req.blob()`; nueva ruta de estado de procesamiento.
- **Esquema DB**: columna de estado en `video_tracks` (migración) y posible tabla/cola de jobs de normalización.
- **UI** (`app/dashboard/television/library/page.tsx`, `components/dashboard/streaming/LibraryUploader.tsx`): cola y progreso de subida; componente compartido con la sección de audio.
- **Infra**: requiere pulsar **"Actualizar nodo"** en cada nodo de streaming remoto tras el deploy (toca el agente y `docker-compose.streaming.yml`).
- VPS/red: una subida de 1 GB hoy pasaría por el panel; se acepta ese relay en esta fase (no se introduce S3 ni subida directa al nodo).
