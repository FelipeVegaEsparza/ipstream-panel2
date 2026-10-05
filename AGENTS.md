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

## Estabilidad del AutoDJ de TV (HLS)

- Todos los videos se re-encodean SIEMPRE a un canónico estricto y uniforme: 1920×1080 con padding, H.264 main@4.0 yuv420p, 30 fps CFR, keyframe cada 2 s, AAC 128k 44.1k estéreo (se agrega silencio si el origen no tiene audio). No se usa remux.
- El AutoDJ emite por `-c:v copy` con la playlist en formato `ffconcat` con `duration` por archivo y timestamps estabilizados (`+genpts+discardcorrupt`, `avoid_negative_ts`, `flvflags no_duration_filesize`). SRS segmenta a 2 s (`hls_fragment 2`, `hls_window 12`).
- El catálogo legado se sanea: al iniciar el AutoDJ los tracks no conformes se excluyen y se re-encolan. Para re-normalizar todo el catálogo de una vez:
  `docker exec ipstream-streaming-agent node scripts/renormalize-videos.js [clientId] [--all]`
- Para verificar conformidad (resolución/fps/SAR/códec/audio/keyframes):
  `docker exec ipstream-streaming-agent node scripts/check-conformity.js [clientId]`
- Tocar `streaming/agent/*` o `streaming/srs/*`: **recordar pulsar "Actualizar nodo"** en los nodos remotos tras el deploy.
