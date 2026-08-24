## Context

El AutoDJ de TV re-encoda en vivo cada video (`libx264 veryfast 2000k`, video-encoder.js:126), lo que consume ~3.2 cores por stream (medido en producción: 312-380%). El upload (video.js:344-395) guarda el archivo tal cual y solo extrae metadatos con ffprobe. El VPS actual es de desarrollo (4 vCPU); el objetivo es que cada stream cueste ≈0 CPU para escalar a decenas de clientes.

## Goals / Non-Goals

**Goals:**
- Normalizar cada video al subir a 1080p H.264/AAC (bitrate 4500k, audio 128k).
- Que el AutoDJ reproduzca por remux (`-c:v copy`) → CPU por stream ≈ 0.
- Manejar fallback para videos viejos no normalizados.
- Migrar/regenerar los videos ya subidos (1 video en producción).

**Non-Goals:**
- Transcodificar en vivo (se elimina salvo fallback).
- Soporte de multi-bitrate/ABR (una sola salida 4500k).
- Tocar la ingesta RTMP del DJ (rtmp-ingest) ni el HLS de SRS.

## Decisions

### 1. Helper `normalizeVideo()` en `video-encoder.js`
Función que, dado un `clientId` y `filepath` dentro del contenedor, decide:
- Probe con ffprobe (ya existe lógica en video.js).
- Si `codec === 'h264' && height <= 1080 && width <= 1920 && pix_fmt === 'yuv420p'` → remux con `-c:v copy -c:a aac` (normaliza solo el audio, mantiene resolución).
- Si no → re-encode: `ffmpeg -i input -vf "scale=min(1920,iw):min(1080,ih):force_original_aspect_ratio=decrease" -c:v libx264 -preset fast -b:v 4500k -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -ar 44100 -ac 2`.
- Escribe a un `.mp4` temporal y reemplaza el archivo original en el contenedor.
- Retorna los nuevos metadatos (width/height/codec/filesize/duration) para el INSERT.
- **Alternativa**: normalizar en un worker/queue → descartada, el volumen es bajo (subidas manuales de clientes); el transcode sincrónico en el upload es aceptable y más simple.

### 2. Upload usa `normalizeVideo()` (video.js)
Después de copiar el archivo al contenedor y antes del INSERT, se llama a `normalizeVideo`. Los metadatos insertados pasan a ser los normalizados (width/height/codec/filesize actualizados). El thumbnail se extrae del archivo ya normalizado.
- El `filesize` del INSERT usa el tamaño del archivo normalizado (no el buffer original).

### 3. AutoDJ con `-c:v copy`
En `startEncoder` (video-encoder.js:126) el comando pasa a `-c:v copy -c:a copy` (o `-c copy`) porque los archivos ya están normalizados. Se mantiene `-re -stream_loop -1 -f concat`.
- **Riesgo**: si un cliente tiene un video viejo (de antes de la normalización) en su playlist, copy podría romper el HLS. Mitigación: ver `fallback` abajo.

### 4. Fallback de normalización en reproducción
En `generatePlaylist`/`startEncoder`, antes de armar el playlist, se verifica cada track contra el formato canónico (columna `codec`/`width` en DB). Si alguno no cumple, se llama a `normalizeVideo` para ese archivo (una vez) antes de generar el playlist. Esto cubre videos subidos antes de este cambio.
- **Alternativa**: backfill en deploy (batch de normalización) → se puede hacer como script manual; el fallback en reproducción es la red de seguridad.

### 5. Transcoder de relay usa copy cuando aplica
El transcoder de la Conexión Universal (video-encoder.js:273) pasa a `-c:v copy` solo si el input de SRS ya es H.264; si no, mantiene el re-encode actual (H.264 de ingesta no garantizado). Esto reduce CPU cuando el DJ publica H.264 estándar.
- **Nota**: el input del relay es RTMP en vivo del DJ; la detección se hace con `-c:v copy` condicional no es trivial → se mantiene el re-encode actual salvo que el source sea H.264 conocido. En esta iteración se deja el transcoder como está (fuera de alcance) salvo que el análisis muestre un win claro. **Decisión**: NO tocar el transcoder de relay en esta iteración para no arriesgar la Conexión Universal; el win principal es el AutoDJ.

### 6. Bitrate 4500k
El valor `-b:v 4500k` es fijo (decisión del usuario). Se centraliza como constante `VIDEO_BITRATE = '4500k'`.

## Risks / Trade-offs

- **Archivos viejos en playlists** → [Riesgo] Mitigación: fallback de normalización en reproducción + script de backfill manual opcional.
- **Transcode sincrónico en upload** → [Riesgo] Mitigación: subidas son manuales y de pocos archivos; si se necesita, luego se mueve a queue.
- **Calidad vs banda** → [Riesgo] Mitigación: 4500k a 1080p es buena calidad; el usuario aceptó el trade-off de banda por viewer. CDN (futuro) quitará la banda del origen.
- **`-c:v copy` con concat de archivos homogéneos** → [Riesgo] Mitigación: todos los archivos quedan 1080p H.264/AAC idénticos tras normalización, el concat copy es seguro. Si un archivo no pasó por normalización, el fallback lo normaliza.

## Migration Plan

1. Deploy del agente con normalización en upload + AutoDJ con copy.
2. Script manual (opcional) para re-normalizar los videos ya subidos (en producción solo hay 1 video).
3. Rollback: revertir `startEncoder` a re-encode y desactivar la normalización en upload (los archivos ya normalizados siguen funcionando con copy o re-encode).

## Open Questions

- Ninguna: el bitrate (4500k), resolución (1080p) y el no-tocar-el-transcoder fueron decididos con el usuario en exploración.
