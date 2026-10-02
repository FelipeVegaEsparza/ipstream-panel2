# Design

## Context

Ver `proposal.md` — Why. Restricciones relevantes del estado actual:

- El agente Fastify (`streaming/agent/server.js`) corre con `bodyLimit: 50MB` y multipart `fileSize: 50MB`.
- El panel (`app/api/dashboard/television/[...params]/route.ts`) lee el body con `req.blob()` (buffer en memoria) y luego lo reenvía con `fetch(..., duplex:'half')`.
- El agente (`routes/video.js`) usa `data.toBuffer()`, escribe `/tmp`, y hace `docker cp` a `ipstream-video-encoder`, que monta `./data/video:/var/lib/video` en el host.
- `normalizeVideo` corre inline en la request y usa `execCmd` con `timeout: 30000` fijo.
- El panel es Next.js 14 (`next start`, Node 20) detrás de Caddy; el agente solo es alcanzable por el panel (puerto 4000 acotado por firewall).
- `video_tracks` lo administran tanto Prisma (panel) como SQL crudo (agente, `CREATE TABLE` + migraciones idempotentes).

## Goals / Non-Goals

**Goals:**
- Subir hasta `MAX_VIDEO_UPLOAD_MB` (default 2048) sin buffering en memoria.
- Cola de subida con progreso y una fase de procesamiento visible.
- Desacoplar la normalización de la request HTTP.

**Non-Goals:**
- Subida directa browser→nodo o uso de S3/MinIO (Fase 3 del análisis).
- Subida reanudable por chunks (Fase 2). No se implementa en este cambio.
- Cambiar el formato canónico ni el bitrate de salida.

## Decisions

### Decisión 1: Mantener el relay browser→panel→nodo, pero en streaming
El byte sigue pasando por el panel. Alternativas: URL firmada directa al nodo (requiere exponer un endpoint de subida en el Caddy del nodo y manejo de tokens), o S3/MinIO (infra nueva). Para 1 GB el relay es viable y evita cambios de firewall/seguridad; las alternativas quedan como evolución futura.

Implementación:
- Panel: no consumir `req.blob()`; pasar `req.body` (ReadableStream) como `body` del `fetch` al agente con `duplex: 'half'`, reenviando `Content-Type` (el `boundary` del multipart) y `Content-Length`.
- Agente: `const data = await req.file()` y `await pipeline(data.file, fs.createWriteStream(dest))` en vez de `toBuffer()`.

### Decisión 2: Volumen de video compartido con el agente; eliminar `docker cp`
Montar `./data/video:/var/lib/video` también en el servicio `agent` de `docker-compose.streaming.yml`. El agente escribe directo en el mismo directorio que ve `video-encoder`. Alternativa descartada: mantener `/tmp` + `docker cp` (duplica I/O de disco, penaliza GBs). El `docker exec ... ffmpeg` para normalizar/thumbnail se mantiene porque ffmpeg vive en el contenedor `video-encoder`.

### Decisión 3: Límite configurable por entorno
`MAX_VIDEO_UPLOAD_MB` (default 2048) se aplica en:
- Fastify `bodyLimit` y multipart `limits.fileSize` del agente.
- Pre-chequeo en el panel usando `Content-Length` del request multipart (rechazo temprano con 413 y mensaje claro) y validando `file.size`.
- El hint de la UI (`Máximo N MB por archivo`).

El `bodyLimit` global del agente se sube/dimensiona a partir del mismo env; el multipart mantiene su propio límite por archivo.

### Decisión 4: Normalización como job en background con estado del track
Se agrega a `video_tracks`: `status` (`pending|processing|ready|error`) y `processingError` (texto nullable). Filas existentes quedan en `ready` (default) para no romper la videoteca.

Flujo de subida:
1. El agente recibe el archivo en streaming, lo guarda en el volumen, inserta el track con `status='pending'` y responde de inmediato (upload HTTP corto).
2. Un runner de jobs in-process (patrón similar a los crons existentes del agente) procesa la cola con **concurrencia 1 por nodo** (ffmpeg re-encode es CPU-intensivo): pone `processing`, corre `normalizeVideo`, actualiza metadatos y deja `ready`; ante error deja `error` + `processingError`.
3. Si el video ya es canónico, el job es remux y termina rápido; igualmente pasa por el runner para unificar el camino.

Alternativas descartadas: mantener síncrono con timeout mayor (bloquea la request y empeora UX), o cola externa tipo BullMQ/Redis (sobre-ingeniería para un job por nodo).

Regla de reproducción: `resolvePlaylistEntries` (y el armado de playlist del encoder) **solo incluye tracks `ready`**, para que AutoDJ no intente reproducir un archivo en proceso o con error.

### Decisión 5: Corregir timeouts
- `execCmd` deja de forzar `timeout: 30000`; el timeout de ffmpeg pasa a ser configurable (ej. `FFMPEG_TIMEOUT_MS`, default 0/sin límite o muy alto). Los comandos cortos (mkdir, mv, stat) pueden seguir con timeout.
- Verificar `server.requestTimeout` del panel (Node 20 default 300s). Si una subida de 1 GB puede superar los 5 min, agregar un `server.js` custom que desactive `requestTimeout` para la ruta de subida (o global), o garantizar que el límite no se alcance. Caddy no impone timeout de body por defecto.

### Decisión 6: UI de cola compartida
Generalizar `components/dashboard/streaming/LibraryUploader.tsx` a un componente reutilizable (p. ej. `MediaUploader`) parametrizando: `accept`, endpoint, método de construcción del endpoint, y `resolveStatusUrl`. Reusar en TV con:
- Progreso de subida vía `XMLHttpRequest.upload.onprogress` (browser→panel).
- Al completar el envío, fase `procesando` con polling a un endpoint de estado del/los tracks (`GET /api/dashboard/television/tracks?...` o un endpoint dedicado) hasta `ready`/`error`.
- Estado por archivo + barra total, igual que audio.

Alternativa descartada: notificar por WebSocket (el agente tiene `ws.js`), más complejo que un polling corto para esta escala.

## Risks / Trade-offs

- **[Relay por el VPS]** → 1 GB por subida consume ancho de banda/CPU del panel. Mitigación: streaming (sin memoria) y, si escala, migrar a subida directa (Fase 3). No bloquea este cambio.
- **[Corte de la request a los 5 min de Node]** → Verificar en deploy con un archivo real; si aplica, custom server con `requestTimeout` desactivado.
- **[Concurrencia 1 de normalización]** → Si varios clientes suben a la vez, encolan y esperan. Aceptable y preferible a saturar CPU del nodo; el estado `processing` lo comunica.
- **[Tracks `processing` visibles pero no reproducibles]** → El listado los muestra con badge; AutoDJ y playlists los ignoran hasta `ready`. Evita fallos de ffmpeg en vivo.
- **[Archivo original en `error`]** → Ocupa disco. Mitigación: mostrar el error y permitir eliminar el track; opcional limpieza futura.
- **[Compatibilidad de `duplex:'half'`]** → Requiere Node 18+ (el proyecto usa Node 20). OK.

## Migration Plan

1. Migración idempotente en el agente (`server.js`, patrón existente): `ALTER TABLE video_tracks ADD COLUMN status ... DEFAULT 'ready'` y `ADD COLUMN processingError ...`, con guardas para no fallar si ya existen. Actualizar `prisma/schema.prisma` (`VideoTrack`) para que el panel lea/escriba el estado.
2. Ajustar `docker-compose.streaming.yml` (volumen compartido en `agent`, env `MAX_VIDEO_UPLOAD_MB`/`FFMPEG_TIMEOUT_MS`).
3. Backfill: las filas existentes quedan `ready` por el default.
4. Deploy: push a `main` (GitHub Actions actualiza panel y agente del VPS principal). **Los nodos remotos requieren pulsar "Actualizar nodo"** (toca agente y compose).
5. Rollback: revertir el commit; el default `ready` mantiene compatibilidad; no hay migración destructiva.

## Open Questions

- Ninguna que cambie specs o el enfoque. La verificación concreta del `requestTimeout` de Node y la concurrencia óptima de normalización se validan durante la implementación.
