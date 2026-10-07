# Project Instructions

## Infrastructure / Deploy

- Producción se despliega vía GitHub Actions en un VPS propio del usuario.
- El usuario tiene acceso SSH al VPS de producción; se puede usar para tareas de deploy, pruebas y diagnóstico.
- Flujo habitual: commit + push a `main` → GitHub Actions despliega automáticamente en el VPS.

## Streaming / Nodos remotos

- El deploy de GitHub Actions solo actualiza el panel y el agente del VPS principal.
- Los **nodos de streaming remotos** (registrados en `/admin/servers`) NO se actualizan solos: requieren pulsar el botón **"Actualizar nodo"** en `/admin/servers` (re-descarga el repo, copia el código, levanta el stack con `--build --force-recreate` y reinicia los streams activos).
- **Siempre que se haga un cambio que toque el streaming-agent o sus scripts** (lib/streaming-client.ts, streaming/agent/*, streaming/liquidsoap/*, docker-compose.streaming.yml, node-provisioner.ts), indicar al usuario que debe pulsar "Actualizar nodo" en cada nodo remoto después del deploy.
- Si el cambio toca SOLO el panel (app/*, lib/* que no use el agente), no hace falta el botón.

## Subida de video de TV (archivos grandes)

- La videoteca de TV sube videos por streaming (sin buffer en memoria) hasta el máximo configurable `MAX_VIDEO_UPLOAD_MB` (default `2048` MB) y muestra una cola con progreso.
- La normalización al formato canónico corre en background: el track pasa por `pending` → `processing` → `ready`/`error`. Solo los tracks `ready` se reproducen en el AutoDJ.
- Envs nuevas, aplican al panel y al agente: `MAX_VIDEO_UPLOAD_MB` (MB, default 2048) y `FFMPEG_TIMEOUT_MS` (ms, `0` = sin límite).
- El agente ahora comparte el volumen `./data/video` con `video-encoder` (escribe las subidas directo a disco).
- Tocar `streaming/agent/*` y `docker-compose.streaming.yml`: **recordar pulsar "Actualizar nodo"** en los nodos remotos tras el deploy.

## Playout de TV: VOD2Live (stitching) — modo por defecto

- `TV_PLAYOUT=stitch` (default): el AutoDJ se sirve como un **manifiesto HLS vivo** (`/api/video/playout/<key>/live.m3u8` en el agente, expuesto público por el panel en `/vod/<key>/live.m3u8`). No hay proceso ffmpeg de AutoDJ.
- **ABR (ladder)**: cada video se empaqueta a HLS en varias rendiciones (`TV_VIDEO_LADDER`, default `1080p:2000,720p:1000`), en `hls/<clientId>/<trackId>/<rendition>/`. `video_tracks.renditions` (JSON) lista las variantes; `hlsPath` es el directorio del track.
  - El canal expone un **master** en `/vod/<key>/live.m3u8` (y `/api/video/playout/<key>/live.m3u8`), con manifiestos vivos por rendición en `live/<rendition>.m3u8`. Los segmentos usan `/seg/<rendition>/<trackId>/<file>`.
  - El player (hls.js) hace **ABR automático**; no hay selector manual.
  - **Intersección:** el master solo lista rendiciones presentes en TODOS los tracks del ciclo. Si hay tracks legados (single-rendition), el canal colapsa a una sola rendición (sin ABR) hasta re-empaquetar todo el ciclo.
- El **stitcher** (`lib/channel-stitcher.js`) arma la ventana viva encadenando assets con `EXT-X-DISCONTINUITY`. Los segmentos se mapean **por índice** entre rendiciones (alineados por GOP), para que el cambio de calidad no salte de posición.
- El **DJ en vivo** sigue por SRS (`/dj/<key>.m3u8`); el player cambia según el estado.
- Reempaquetar catálogo: `docker exec ipstream-streaming-agent node scripts/package-videos.js [clientId] [--force]`.
- Al re-encodear/reemplazar un track, los segmentos mantienen su nombre → **purgar caché de Cloudflare** de esas URLs.
- `TV_PLAYOUT=concat` restaura el modo legacy (concat `-c copy` a RTMP, requiere formato uniforme).
- Tocar `streaming/agent/*`: **"Actualizar nodo"** en los remotos.

## Estabilidad del AutoDJ de TV (HLS)

- Los videos se llevan a un canónico estricto y uniforme: 1920×1080 con padding, H.264 main@4.0 yuv420p, 30 fps CFR, keyframe cada 2 s, AAC 128k 44.1k estéreo (se agrega silencio si el origen no tiene audio).
- **Fast-path**: si el archivo ya cumple el canónico (resolución/fps/SAR/audio/keyframes), NO se re-encodea (queda `ready` al instante). Solo se re-encodea lo que no cumple.
- El re-encode usa `FFMPEG_PRESET` (default `ultrafast`) y `FFMPEG_THREADS` (default `0` = auto) para bajar la CPU. En servidores con más margen se puede subir a `veryfast`/`fast` para mejor calidad.
- El AutoDJ emite por `-c:v copy` con la playlist en formato `ffconcat` con `duration` por archivo y timestamps estabilizados (`+genpts+discardcorrupt`, `avoid_negative_ts`, `flvflags no_duration_filesize`). SRS segmenta a 2 s (`hls_fragment 2`, `hls_window 12`).
- El catálogo legado se sanea: al iniciar el AutoDJ los tracks no conformes se excluyen y se re-encolan. Para re-normalizar todo el catálogo de una vez:
  `docker exec ipstream-streaming-agent node scripts/renormalize-videos.js [clientId] [--all]`
- Para verificar conformidad (resolución/fps/SAR/códec/audio/keyframes):
  `docker exec ipstream-streaming-agent node scripts/check-conformity.js [clientId]`
- Tocar `streaming/agent/*` o `streaming/srs/*`: **recordar pulsar "Actualizar nodo"** en los nodos remotos tras el deploy.
