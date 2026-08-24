## Why

La página "Conexión OBS" del dashboard afirma que la ingesta acepta "H.264 y H.265 (enhanced RTMP)". En producción con SRS v5 esto es falso: SRS descarta el video de OBS que llega por enhanced RTMP (HEVC/AV1) con `drop unknown header video`, produciendo pantalla negra aunque el estado marque EN VIVO (DJ). Verificado en VPS: con codec x264 (H.264 estándar) el video se ve correctamente. El texto engaña a los DJs y los lleva a un estado que parece funcionar pero entrega video negro.

## What Changes

- Actualizar el texto de la sección "Conexión Universal" en `app/dashboard/television/connection/page.tsx` para indicar **solo H.264 estándar** (x264/NVENC), quitando la afirmación de soporte H.265/enhanced RTMP.
- Agregar una nota que oriente a configurar OBS con encoder H.264 y "enhanced streaming" desactivado para evitar la pantalla negra.
- Alinear la spec `television/rtmp-ingest` con el comportamiento real: la ingesta relay acepta H.264 (no cualquier códec) mientras corra SRS v5.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `television/rtmp-ingest`: se modifica la requirement "Conexión universal vía relay" que hoy declara soporte para "OBS enhanced RTMP y cualquier códec" (H.264/H.265). Pasa a declarar soporte para H.264 estándar y deja explícito que HEVC/AV1 por enhanced RTMP queda descartado (SRS v5 los rechaza en ingesta).

## Impact

- `app/dashboard/television/connection/page.tsx`: textos de la sección "Conexión Universal".
- `openspec/specs/television/rtmp-ingest/spec.md`: requirement de la Conexión Universal (via delta spec del change).
- Sin cambios de infraestructura, agent o SRS. Sin cambios de comportamiento de streaming (el pipeline ya funciona con H.264).
