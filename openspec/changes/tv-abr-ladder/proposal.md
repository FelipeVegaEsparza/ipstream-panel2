# Proposal

## Why

Hoy cada video de TV se empaqueta a una **sola rendición** (1080p, ~1500–2000k). Los espectadores con conexión débil no pueden bajar de calidad y sufren cortes, mientras que los de buena conexión no aprovechan mejor imagen. Un ladder **ABR (1080p + 720p)** deja que el player elija automáticamente según el ancho de banda, cubriendo a la mayoría del público sin intervención manual ni un selector de calidad.

## What Changes

- Empaquetar cada video de TV en **dos rendiciones**: `1080p` (~2000k) y `720p` (~1000k), ambas con GOP/keyframes alineados y segmentos de 2 s, para que las variantes queden sincronizadas.
- Generar un **`master.m3u8`** por canal que liste las variantes, y **manifiestos vivos por rendición** desde el stitcher.
- El **stitcher** arma el manifiesto vivo por rendición manteniendo **el mismo ciclo/posición** en todas las calidades (mapeo por índice de segmento).
- El **player** (dashboard y `/tv`) usa el master y hace **ABR automático** con hls.js.
- **Configuración del ladder por env** (resoluciones/bitrates), con default `1080p+720p`.
- **Alcance:** solo **subidas nuevas**. El catálogo existente queda en una sola rendición (los originales ya se borran tras empaquetar, así que no se re-encoda retroactivamente).

## Capabilities

### New Capabilities
- `television/abr-playout`: expone el canal como HLS adaptativo — master playlist + manifiestos vivos por rendición, ciclo sincronizado entre calidades y reproducción ABR automática en el player.

### Modified Capabilities
- `television/video-normalization`: el empaquetado de TV pasa de **una rendición 1080p** a un **ladder 1080p+720p** (nuevo layout de almacenamiento por rendición y metadatos).

## Impact

- **Agente:** `lib/video-packager.js` (empaquetado multi-rendición), `lib/channel-stitcher.js` y `routes/playout.js` (master + variantes), `routes/tv.js` y player.
- **Panel:** rutas `/vod/<key>/…` (master, live por rendición, segmentos por rendición), helpers de URL pública, player del dashboard.
- **DB:** `video_tracks` — nuevo layout de `hlsPath` (por rendición) y metadatos de rendiciones.
- **Scripts:** `scripts/package-videos.js` (empaqueta ladder).
- **Infra:** nodos remotos requieren **"Actualizar nodo"**; Cloudflare cachea más segmentos (manifiestos sin cachear).
- **No-goals:** ABR retroactivo del catálogo existente, selección manual de calidad, DRM, y cambio del modo `concat` legacy.
