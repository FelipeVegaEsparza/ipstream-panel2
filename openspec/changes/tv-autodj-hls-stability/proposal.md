# Proposal: Estabilidad del AutoDJ de TV (HLS sin cortes)

## Why

El AutoDJ de Televisión se traba a los ~15 s de iniciar: el player buffea la ventana inicial de HLS y luego no llega más contenido, quedando "cargando". El AutoDJ concatena los videos con `-c:v copy` (`streaming/agent/lib/video-encoder.js`), pero la normalización **no garantiza que los archivos sean homogéneos**: conserva resolución/fps de cada video y no fuerza keyframes. El demuxer `concat` de FFmpeg exige archivos con los mismos streams/time base y puede introducir gaps; con `hls_wait_keyframe on`, SRS corta en `max(hls_fragment, gop)`. Resultado: en cada transición o loop el flujo RTMP se rompe y SRS deja de segmentar. Hoy la TV no es confiable.

## What Changes

- **Normalización estricta y uniforme**: todo video subido se re-encodea a un formato canónico fijo — resolución 1920×1080 con letterbox (padding), 30 fps CFR, H.264 main@4.0, yuv420p, GOP fijo con keyframe cada 2 s, AAC 128k 44.1 kHz estéreo (con pista de silencio si el origen no tiene audio). Se elimina el fast-path de remux, que no puede garantizar keyframes.
- **Emisión del AutoDJ endurecida**: playlist `concat` con `duration` por archivo, timestamps monotónicos (`+genpts`, `avoid_negative_ts`), FLV limpio (`flvflags no_duration_filesize`) y loop sin discontinuidad. Se alinea con lo que ya hace `startTranscoder` para el DJ en vivo.
- **SRS/HLS afinado**: fragmentos alineados al GOP (keyframe cada 2 s ⇒ segmentos de 2–3 s), ventana coherente y verificación de continuidad de segmentos.
- **Salvaguarda de reproducción**: solo se emiten tracks `ready` que cumplan el canónico estricto; cualquier track legado no conforme se re-normaliza antes de entrar al aire.
- **Verificación automatizada**: script de conformidad (todos los archivos del playlist idénticos en width/height/fps/SAR/códec/pixfmt/audio) y prueba de soak del stream (N minutos sin cortes ni `EXT-X-ENDLIST`).

## Capabilities

### New Capabilities

- `television/autodj-stream-stability`: el AutoDJ de TV emite un stream continuo y reproducible (timestamps monotónicos, segmentos HLS alineados a keyframes, transiciones y loop sin cortes) y expone verificación de conformidad del playlist.

### Modified Capabilities

- `television/video-normalization`: la normalización pasa a producir un formato canónico **estricto y uniforme** (resolución/fps/GOP/perfil/audio fijos, con padding y silencio si falta audio) y deja de omitir el re-encode de videos "casi" canónicos.

## Impact

- **Agente** (`streaming/agent`): `lib/video-encoder.js` (normalización estricta, generación de playlist con duraciones, comando de emisión con flags de estabilidad, loop), `routes/video.js` y `routes/video-schedule.js` (pasan entries y garantizan solo `ready`).
- **SRS** (`streaming/srs/conf/srs.conf`): ajuste de `hls` para segmentar alineado al GOP.
- **Sin cambios de esquema** esperados; se reutiliza `video_tracks.status` y los metadatos existentes.
- **Operación**: todo cambio en `streaming/agent/*` o `streaming/srs/*` requiere redeploy del VPS principal y pulsar **"Actualizar nodo"** en los nodos remotos.
- **Riesgo de migración**: los videos ya subidos que no cumplan el canónico estricto deberán re-normalizarse (job en background) antes de reproducirse.
