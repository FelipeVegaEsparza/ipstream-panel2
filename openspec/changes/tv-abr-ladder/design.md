# Design

## Context

Ver `proposal.md` (Why). Estado actual relevante:
- El packager (`streaming/agent/lib/video-packager.js`) produce **una rendición** por track en `hls/<clientId>/<trackId>/` (index.m3u8 + `seg_%05d.ts`), registrada en `video_tracks.hlsPath`.
- El stitcher (`lib/channel-stitcher.js` + `routes/playout.js`) arma **un** manifiesto vivo parseando el playlist VOD de cada track.
- El player (dashboard y `routes/tv.js`) carga un único `live.m3u8`.
- Cloudflare cachea `.ts` (inmutable) y no cachea `.m3u8`.
- Los originales se borran tras empaquetar (no hay re-enpaquetado retroactivo).

## Goals / Non-Goals

**Goals:**
- Empaquetar subidas nuevas en un ladder **1080p + 720p** con segmentos alineados por índice.
- Servir un **master + manifiestos vivos por rendición** sincronizados.
- Reproducción **ABR automática** sin cambios visibles de URL para el espectador.
- Mantener compatibilidad con tracks **single-rendition** existentes.

**Non-Goals:**
- Re-empaquetar el catálogo existente (requiere re-subir).
- Selector manual de calidad, DRM, o más de 2 rendiciones.
- Cambiar el modo `concat` legacy.

## Decisions

### D1. Layout de almacenamiento por rendición
Cada track se empaqueta en subdirectorios por rendición:
```
hls/<clientId>/<trackId>/<rendition>/index.m3u8
hls/<clientId>/<trackId>/<rendition>/seg_%05d.ts
```
`video_tracks.hlsPath` pasa a ser el **directorio del track** (`hls/<clientId>/<trackId>`). Se agrega una columna `renditions` (JSON) con `[{name,width,height,bitrateKbps}]`.
- **Compatibilidad:** los tracks legados tienen los segmentos en la raíz de `hlsPath` (sin subdir) y `renditions = null`; se tratan como **una sola rendición** ("native").
- **Alternativa descartada:** un `hlsPath` por rendición en tabla aparte → más joins y migración compleja.

### D2. Ladder configurable
Env `TV_VIDEO_LADDER=1080p:2000,720p:1000` (rendición:bitrateKbps). Default `1080p:2000,720p:1000`. El packager itera las rendiciones; cada una con `-preset veryfast`, GOP 60, keyframe 2 s y `-sc_threshold 0`, para que los límites de segmento coincidan entre calidades.

### D3. Sincronización del ciclo (sin drift)
El stitcher arma el ciclo **una vez desde una rendición de referencia** (la más alta disponible) y, para cada rendición, mapea el **mismo índice de segmento** (`seg_%05d.ts`). Requisito: todas las rendiciones tienen el mismo número/orden de segmentos (garantizado por GOP/segmentación idénticos).
- Si una rendición tiene distinto conteo (edge case), el canal la **excluye** del master para no desincronizar.
- **Alternativa descartada:** construir un ciclo independiente por rendición y alinear por tiempo → susceptible a drift; el mapeo por índice es determinista.

### D4. Esquema de URLs
- `/vod/<key>/live.m3u8` → **master** (variantes) — mantiene la URL de entrada actual.
- `/vod/<key>/live/<rendition>.m3u8` → manifiesto vivo de esa rendición.
- `/vod/<key>/seg/<rendition>/<trackId>/<file>` → segmentos.
`/tv/<key>.m3u8` redirige al master. Los tracks single-rendition se exponen con su única rendición.

### D5. Intersección de rendiciones del canal
El master lista solo las rendiciones presentes en **todos** los tracks del ciclo (intersección). Con tracks legados (single-rendition) en el ciclo, el ladder colapsa a esa única rendición. El ABR se activa cuando **todo** el ciclo está empaquetado con el ladder. (Consecuencia de "solo subidas nuevas".)

### D6. Player
hls.js usa el master y hace ABR automático. Se ajusta la lógica de "probe"/recuperación (que hoy busca `#EXT-X-ENDLIST` en un manifiesto con segmentos) para operar sobre el master/variantes.

## Risks / Trade-offs

- **[Catálogo mixto no tiene ABR]** → documentado; se activa al re-empaquetar todo el ciclo (o subir nuevos).
- **[Más encode/storage]** → 2× tiempo de encode; ~1.5× disco. Aceptado.
- **[Desincronización]** → mitigado con mapeo por índice y exclusión de rendiciones con conteo distinto.
- **[Segmentos nuevos, misma URL de CDN]** → los nombres cambian respecto al layout viejo (ahora bajo `/<rendition>/`), así que la caché no colisiona con tracks legados.
- **[Nodos remotos]** → requieren "Actualizar nodo".
- **[Rollback]** → volver el packager a single-rendition (env/código); el stitcher soporta ambos layouts, así que los tracks ya empaquetados con ladder siguen sirviendo.

## Migration Plan

1. Agregar columna `renditions` (nullable) a `video_tracks` (migración idempotente del agente).
2. Desplegar packager ladder + stitcher multi-rendición + rutas + players.
3. Subidas nuevas → layout ladder; tracks viejos intactos.
4. Rollback: env/código a single-rendition; el stitcher sigue sirviendo lo existente.

## Open Questions

- Formato final de la columna `renditions` (JSON inline vs tabla) — se resuelve en implementación sin afectar specs.
- Bitrates exactos del ladder (2000k/1000k) — ajustables por env sin cambiar el diseño.
