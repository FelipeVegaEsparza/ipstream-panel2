## 1. Normalización al subir

- [x] 1.1 Crear helper `normalizeVideo(clientId, filepath)` en `streaming/agent/lib/video-encoder.js`: probe con ffprobe, decide remux (copy) si ya es H.264 yuv420p ≤1080p, o re-encode a 1080p H.264 4500k si no; reemplaza el archivo en el contenedor y retorna metadatos finales.
- [x] 1.2 Definir constantes de formato canónico (VIDEO_BITRATE='4500k', max 1920×1080, audio AAC 128k 44.1kHz stereo, 30fps).
- [x] 1.3 En `streaming/agent/routes/video.js`: llamar `normalizeVideo` tras copiar el archivo y antes del INSERT; usar los metadatos normalizados (width/height/codec/filesize/duration) en el INSERT; extraer el thumbnail del archivo ya normalizado.

## 2. AutoDJ por remux

- [x] 2.1 En `startEncoder` (`streaming/agent/lib/video-encoder.js:126`): cambiar el comando ffmpeg a `-c:v copy -c:a copy` (remux), manteniendo `-re -f concat -stream_loop -1`.
- [x] 2.2 Agregar fallback en la reproducción: antes de generar el playlist, verificar cada track contra el formato canónico (codec/width en DB); si alguno no cumple, normalizarlo con `normalizeVideo` (una vez) antes de generar el playlist.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit` sin errores nuevos (el agente no usa TS, pero el panel sí; verificar que no haya referencias rotas).
- [ ] 3.2 En producción: subir un video 1080p H.264 (debe quedar sin re-encode, remux) y otro H.265/4K (debe normalizarse a 1080p); verificar metadatos en DB.
- [ ] 3.3 Medir CPU del encoder con un stream activo: debe ser ≈0 (remux) en lugar de ~3.2 cores.
- [ ] 3.4 Verificar que el HLS sigue reproduciéndose correctamente (sin pantalla negra) con los videos normalizados.
