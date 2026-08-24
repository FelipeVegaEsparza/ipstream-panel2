## Why

El AutoDJ de video re-encoda en vivo todo video a `libx264 -preset veryfast -b:v 2000k` (streaming/agent/lib/video-encoder.js:126). Un solo stream 1080p consume ~3.2 cores de los 4 del VPS (medido en producción: 312-380%), por lo que el VPS se satura con 2-3 videos activos. Esto bloquea escalar a más clientes. La solución es normalizar los videos **al subir** a un formato homogéneo (1080p H.264/AAC), de modo que el AutoDJ pueda hacer `-c:v copy` (CPU ≈ 0 por stream).

## What Changes

- **Normalización al subir** (`streaming/agent/routes/video.js`): al recibir un video, se normaliza a **1920×1080, H.264 High, yuv420p, 30fps, bitrate 4500k** antes de guardar.
  - Si el archivo ya es H.264 yuv420p a ≤1080p → `-c:v copy` (sin re-encode, casi 0 CPU).
  - Si es H.265/AV1/4K/1440p → re-encode a 1080p (una vez por archivo).
  - Si es menor a 1080p → se mantiene su resolución (no upscale).
  - El audio se normaliza a AAC 128k 44.1kHz stereo.
- **AutoDJ con `-c:v copy`** (`streaming/agent/lib/video-encoder.js`): el encoder deja de re-encodear y hace `-c:v copy -c:a copy` porque los archivos ya están normalizados. CPU por stream ≈ 0.
- **Transcoder de relay** (`streaming/agent/lib/video-encoder.js:273`): también pasa a copiar cuando el input ya es H.264 compatible (para la Conexión Universal / OBS), manteniendo el re-encode solo si el source no es H.264.
- **BREAKING**: el bitrate de salida cambia de 2000k a 4500k (más calidad, más banda por viewer). La resolución máxima pasa a 1080p.

## Capabilities

### New Capabilities
- `television/video-normalization`: Normalización de videos de TV a un formato canónico (1080p H.264/AAC 4500k) al subir, y reproducción del AutoDJ por remux (`-c:v copy`) para minimizar el costo de CPU por stream.

### Modified Capabilities
<!-- Ninguna: rtmp-ingest no cambia; se agrega la capability nueva. -->

## Impact

- **Agente** (`streaming/agent/routes/video.js`): normalizar en el upload (paso entre `ffprobe` y el INSERT).
- **Agente** (`streaming/agent/lib/video-encoder.js`): AutoDJ y transcoder usan `-c:v copy` cuando el source es H.264 compatible.
- **`video_encoder.js`**: helper de normalización reutilizable.
- **DB**: `video_tracks.width/height/codec/filesize` se actualizan a los valores normalizados (el archivo almacenado es el normalizado).
- **Frontend**: la Videoteca ya muestra width/height/codec; se mantiene (ahora refleja el normalizado).
- **Comportamiento**: los videos subidos se guardan en 1080p (o su resolución si es menor), bitrate de salida 4500k.
