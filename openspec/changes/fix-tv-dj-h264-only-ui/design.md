## Context

Ver proposal.md (Why) para la motivación. Estado actual relevante:

- La página de conexión (`app/dashboard/television/connection/page.tsx`) muestra "Conexión Universal (H.264 / H.265)" y el texto "Acepta H.264 y H.265 (enhanced RTMP)".
- En producción con SRS v5 (image `ossrs/srs:5`), el video de OBS que llega por enhanced RTMP (HEVC/AV1) se descarta en ingesta: SRS loguea `drop unknown header video, bytes[0]=0xffffffa1` y el HLS de `/dj/` queda con track h264 sin SPS (width=0), pantalla negra aunque el estado marque `live`. Verificado en VPS: con x264 (H.264 estándar) el video se ve correctamente.
- La spec `television/rtmp-ingest` declara soporte para "OBS enhanced RTMP y códecs H.264/H.265", que no se corresponde con el comportamiento real de SRS v5.

## Goals / Non-Goals

**Goals:**
- Que la página de conexión OBS informe el requisito real: **H.264 estándar** (no HEVC/AV1 enhanced RTMP).
- Alinear la spec con el comportamiento real del sistema.
- Reducir la fricción de los DJs que hoy llegan a un estado "EN VIVO" con video negro.

**Non-Goals:**
- No migrar SRS a v6 ni agregar soporte real para HEVC/AV1 (queda como cambio futuro si se quiere "todos los encoders").
- No tocar el pipeline de streaming (transcoder, hooks, URLs HLS).
- No cambiar el comportamiento de detección/takeover del DJ.

## Decisions

### D1. Texto de la UI apuntando a H.264 estándar
- En `app/dashboard/television/connection/page.tsx`:
  - Título de la sección: "Conexión Universal (H.264)" (quitar "/ H.265").
  - Nota de ayuda: indicar que se debe usar un encoder H.264 estándar (p.ej. x264 o NVENC) y **desactivar** "Enhanced streaming" / no usar HEVC/AV1, para evitar pantalla negra.
- Alternativa considerada: dejar el texto y documentar solo en DEPLOY.md. Descartada: el texto activo es lo que el DJ ve en el momento de configurar OBS; corregirlo es el fix directo del problema reportado.

### D2. Delta spec que refleja el comportamiento real
- Modificar la requirement "Conexión universal vía relay" en `television/rtmp-ingest` para declarar soporte de H.264 estándar y documentar que HEVC/AV1 por enhanced RTMP queda descartado en ingesta con SRS v5.
- No se agregan requirements nuevas de comportamiento: el pipeline ya existe y funciona; solo cambia lo que la spec declara que soporta.

## Risks / Trade-offs

- [El usuario podría querer HEVC/AV1 de verdad (pregunta original "todos los encoders")] → Este change solo corrige la comunicación; el soporte real se puede plantear después como un change de SRS v6 o ingesta FFmpeg. No se cierra la puerta, solo se deja el estado documentado.
- [Texto nuevo desactualizado si algún día se migra a SRS v6] → La nota queda ligada a "SRS v5"; cuando migre, la spec y el texto se revisan en ese change.

## Migration Plan

1. Editar `app/dashboard/television/connection/page.tsx` (título + nota).
2. Deploy normal (push a main → GitHub Actions).
3. Sin cambios de infra ni de base de datos. Rollback: revertir el texto.
