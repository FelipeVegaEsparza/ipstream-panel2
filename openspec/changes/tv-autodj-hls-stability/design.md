# Design

## Context

Ver `proposal.md` — Why. Estado actual y restricciones que moldean el enfoque:

- El AutoDJ se emite con `ffmpeg -re -f concat -safe 0 -stream_loop -1 -i playlist.txt -c:v copy -c:a copy -f flv` (`streaming/agent/lib/video-encoder.js:175`).
- `normalizeVideo` (`:440`) preserva resolución/fps para videos ≤1080p y usa `scale=…:force_original_aspect_ratio=decrease` (resolución variable) sin `-g`/keyframes.
- `startTranscoder` (`:302`), el path del DJ en vivo, ya usa `+genpts+discardcorrupt`, `use_wallclock_as_timestamps` y `flvflags no_duration_filesize` porque sin eso SRS genera fragmentos que el player no decodifica.
- La doc de SRS confirma que con `hls_wait_keyframe on` la duración del segmento es `max(hls_fragment, gop)`; la doc de FFmpeg exige que los archivos del `concat` tengan mismos streams/time base y advierte gaps si las duraciones difieren.
- SRS corre con `hls_fragment 3`, `hls_window 18`, `hls_wait_keyframe` (default on) y `hls_dispose on` (`streaming/srs/conf/srs.conf:32`, parece un valor inválido: debería ser segundos).

## Goals / Non-Goals

**Goals:**
- AutoDJ con HLS continuo y reproducible durante horas (sin estancarse a los ~15 s).
- Formato canónico estricto y uniforme para que el copy-concat sea válido.
- Transiciones y loop sin discontinuidades de timestamp.
- Verificación automatizada de conformidad y soak.

**Non-Goals:**
- ABR/multi-bitrate, LL-HLS o reducir latencia por debajo de lo actual.
- Cambiar el player a otro protocolo (WebRTC/HTTP-FLV).
- Rediseñar la UI.

## Decisions

### Decisión 1: Canónico estricto, siempre re-encode (se elimina el fast-path de remux)
El remux no puede agregar keyframes ni homogeneizar resolución/fps, así que no puede garantizar un concat estable. Se normaliza **todo** upload a un formato fijo:

```
-vf "scale=1920:1080:force_original_aspect_ratio=decrease,
     pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,
     fps=30"
-c:v libx264 -preset fast -b:v 4500k -maxrate 5000k -bufsize 9000k
-pix_fmt yuv420p -profile:v main -level:v 4.0
-g 60 -keyint_min 60 -sc_threshold 0
-c:a aac -b:a 128k -ar 44100 -ac 2
-avoid_negative_ts make_zero -movflags +faststart
```

- **Padding**: garantiza 1920×1080 exactos (SAR 1:1) sin deformar; resuelve el concat de aspectos distintos.
- **`fps=30` CFR + `-g 60` + `keyint_min 60` + `sc_threshold 0`**: keyframe exacto cada 2 s ⇒ SRS segmenta 2 s y el player puede empezar en cualquier límite.
- **Audio**: si el origen no tiene audio, se agrega silencio (`-f lavfi -i anullsrc=r=44100:cl=stereo -shortest`) para que todos los archivos tengan el mismo stream.
- Corre en el job de background existente, así que el costo de CPU es en subida, no en reproducción.

Alternativa descartada: mantener remux cuando los metadatos "coinciden". La verificación de GOP real requiere `ffprobe -show_frames` (caro) y no elimina el riesgo; no vale la pena para "que funcione perfecto".

### Decisión 2: Emisión con `copy` de archivos uniformes + estabilización de timestamps
Con archivos estrictamente uniformes, `-c:v copy -c:a copy` es válido. Se endurece el comando del AutoDJ:

```
ffmpeg -re -fflags +genpts+discardcorrupt \
  -f concat -safe 0 -stream_loop -1 -i playlist.txt \
  -avoid_negative_ts make_zero -c:v copy -c:a copy \
  -flvflags no_duration_filesize -f flv rtmp://srs:1935/live/<key>
```

- `+genpts` genera PTS faltantes; `discardcorrupt` descarta paquetes corruptos; `avoid_negative_ts make_zero` evita DTS negativos que rompen FLV/HLS.
- `flvflags no_duration_filesize`: FLV limpio para el muxer HLS de SRS (mismo criterio que el transcoder).
- **Playlist con duraciones**: el archivo de concat se escribe con cabecera `ffconcat version 1.0` y una línea `duration <seg>` por archivo (probeada y guardada en DB), para que el demuxer no introduzca gaps cuando los streams no miden exactamente igual.
- **Loop**: se mantiene `-stream_loop -1`; el soak valida que el borde del loop no rompa timestamps. Si fallara, el fallback es generar un playlist largo (repetir las entries N veces) y reiniciar periódicamente el proceso.

Alternativa descartada: re-encodear en cada reproducción (como el DJ). Es lo más robusto pero revive el costo de ~cores por stream que la normalización buscaba evitar. Se reserva como fallback si el soak falla.

### Decisión 3: SRS/HLS alineado al GOP
```
hls {
  enabled on;
  hls_path ./objs/nginx/html;
  hls_fragment 2;        # alineado al keyframe de 2 s
  hls_window 12;         # ~6 segmentos
  hls_td_ratio 1.0;
  hls_wait_keyframe on;
  hls_dispose 30;        # (corrige `on`, debe ser segundos >= window)
  hls_ctx off;
}
```
Con GOP=2 s los segmentos salen parejos y el manifiesto se renueva cada ~2 s. `hls_dispose` bien seteado evita borrar HLS de más entre reinicios.

### Decisión 4: Salvaguarda de reproducción y legado
Antes de emitir, el sistema verifica que cada track sea `ready` y conforme; los no conformes se excluyen y se encolan para re-normalización (reutilizando `video_tracks.status`). El fallback `ensureCanonicalEntries` deja de ser "mejor esfuerzo" y pasa a validar el canónico estricto.

### Decisión 5: Verificación y soak (parte del entregable, no opcional)
- **Conformidad**: script que corre `ffprobe` sobre cada archivo del playlist y falla si difieren `width/height/r_frame_rate/sample_aspect_ratio/codec_name/pix_fmt` de video o los parámetros de audio; opcionalmente valida el intervalo de keyframes con `-skip_frame nokey`.
- **Soak**: reproducir el AutoDJ N minutos y muestrear el `.m3u8` (que siga agregando segmentos, sin `EXT-X-ENDLIST`) y el log de ffmpeg (sin errores de timestamp).

### Decisión 6: Endurecer el player (secundario)
hls.js con `lowLatencyMode:false`, `backBufferLength` acotado y límites de buffer/reintentos más tolerantes. No es la causa raíz; mejora la recuperación.

## Risks / Trade-offs

- **[CPU/tiempo de subida]** → El re-encode estricto tarda más que el remux. Mitigación: corre en background (concurrencia 1) y el track queda `processing` hasta `ready`.
- **[Una generación de pérdida de calidad]** → Aceptable para TV; se puede subir el bitrate o usar `-preset medium` si se necesita.
- **[Tamaño en disco]** ↑ (padding + CFR + GOP fijo). Mitigación: cuota de storage existente.
- **[Loop con copy puede fallar en casos raros]** → El soak lo detecta; fallback a re-encode en play o playlist largo.
- **[Legado no conforme]** → Queda fuera del aire hasta re-normalizarse. Mitigación: job de re-normalización masiva + aviso en la UI.
- **[`hls_dispose on` inválido]** → Corregir a segundos; si estaba mal interpretado, HLS podía limpiarse antes de tiempo.

## Migration Plan

1. Cambiar `lib/video-encoder.js`: normalización estricta, playlist con duraciones, comando de emisión endurecido, validador de conformidad.
2. Ajustar `streaming/srs/conf/srs.conf` (fragment/window/wait_keyframe/dispose).
3. Re-normalizar el catálogo existente: script que encola todos los tracks no conformes (background) y los excluye hasta `ready`.
4. Verificación en un nodo: conformidad + soak antes de dar por cerrado.
5. Deploy: push a `main` (VPS principal) + **"Actualizar nodo"** en remotos (toca agente y SRS).
6. Rollback: revertir el commit; los tracks re-normalizados siguen siendo H.264/AAC válidos.

## Open Questions

- Resolución objetivo (1080p vs 720p) y bitrate: se deja como constante configurable; no cambia el enfoque.
- Si el soak del loop con `copy` falla, decidir entre re-encode en play o playlist largo periódico; se resuelve con evidencia del soak.
