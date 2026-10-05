# Tasks

## 1. Normalización canónica estricta

- [x] 1.1 Cambiar `normalizeVideo` en `streaming/agent/lib/video-encoder.js` a re-encode estricto (scale+pad 1920×1080, `fps=30` CFR, `-g 60 -keyint_min 60 -sc_threshold 0`, perfil main@4.0, yuv420p, AAC 128k 44.1k estéreo, silencio si falta audio) y eliminar el fast-path de remux; verificar con `ffprobe` un video subido: 1920×1080, 30 fps, SAR 1:1, audio AAC 44100, y keyframes cada ~2 s con `-skip_frame nokey`.
- [x] 1.2 Actualizar `probeVideo`/`isCanonical` para el canónico estricto (leer fps, SAR y audio) y que los no conformes se encolen; verificar que un video 720p se re-encodea a 1920×1080 y queda `ready` conforme.
- [x] 1.3 Crear un script de conformidad de playlist que probea todos los archivos y falla si difieren resolución/SAR/fps/códec/pixfmt/audio; verificar que falla con un playlist mixto y pasa con uno uniforme.

## 2. Emisión y loop del AutoDJ

- [x] 2.1 `generatePlaylist` escribe cabecera `ffconcat version 1.0` y una línea `duration <seg>` por archivo; verificar el contenido del playlist generado para un cliente con varios videos.
- [x] 2.2 Endurecer `startEncoder` con `-fflags +genpts+discardcorrupt`, `-avoid_negative_ts make_zero` y `-flvflags no_duration_filesize`; verificar que el stream arranca, avanza y el `.m3u8` agrega segmentos nuevos.
- [x] 2.3 Ejecutar un soak del AutoDJ (N minutos) y verificar que el video avanza tras el borde del loop, que el `.m3u8` sigue creciendo y que no aparece `#EXT-X-ENDLIST` mientras está al aire.
- [x] 2.4 Si el soak detecta discontinuidad en el loop, implementar el fallback (playlist largo repetido con reinicio periódico o re-encode en play) y verificar que el soak pasa. _(El soak pasó sin discontinuidades: no se requirió fallback.)_

## 3. SRS / HLS

- [x] 3.1 Ajustar `streaming/srs/conf/srs.conf`: `hls_fragment 2`, `hls_window 12`, `hls_td_ratio 1.0`, `hls_wait_keyframe on`, `hls_dispose 30` (corrige el valor `on` inválido); verificar que SRS levanta y segmenta.
- [x] 3.2 Con un AutoDJ activo, verificar que los `.ts` tienen duración regular (~2 s) y que el `.m3u8` rota sin quedar stale.

## 4. Legado y salvaguarda de reproducción

- [x] 4.1 Excluir del aire los tracks no conformes y encolarlos para re-normalización; verificar que no entran a la playlist de emisión y que pasan por `processing → ready`.
- [x] 4.2 Crear un script de re-normalización masiva del catálogo existente; verificar que al terminar todos los tracks del catálogo son conformes.

## 5. Deploy y documentación

- [x] 5.1 Ejecutar `npm run build` del panel (si aplica) y una prueba end-to-end en un nodo: subir video, normalizar, iniciar AutoDJ y correr el soak; verificar sin cortes.
- [x] 5.2 Documentar en `AGENTS.md`/README el nuevo comportamiento (re-encode estricto, re-normalización de legado) y recordar pulsar "Actualizar nodo" en los remotos; verificar que la nota aparece en la documentación.
