# Proposal

## Why

El sistema de estadísticas actual es impreciso y pobre: los snapshots cada 5 minutos se agrupan por día en UTC (la vista "24 horas" devuelve 1-2 puntos), el "pico" reutiliza el `listener_peak` acumulado de Icecast (no el pico del período), la zona horaria corre los días para clientes fuera de UTC y Televisión no tiene histórico alguno. Los clientes necesitan una sección de analítica real, que cubra radio y TV con métricas correctas en su zona horaria, comparables entre períodos.

## What Changes

- Reemplazar la métrica basada en `stream_stats` por un pipeline de analítica:
  - **Audiencia (muestreo cada 1 min)**: radio desde `status-json.xsl` de Icecast (concurrencia/pico) y TV desde el log de Caddy (espectadores).
  - **Sesiones (eventos)**: un registro por request de escucha a partir del access log de Caddy (`stream-access.log` en radio y `access.log` en TV), con IP real, duración, user-agent y bytes. Caddy es la única fuente con la IP real del oyente (Icecast está detrás de Caddy).
- Agregar **rollups horarios y diarios tz-aware** y **retención por capas**: muestras crudas 30 días, rollups 12-24 meses.
- Agregar **GeoIP** (país/ciudad vía `geoip-lite`) y clasificación de **dispositivo/navegador** por sesión.
- Nueva sección de panel `/dashboard/estadisticas` con tabs **Radio | TV**: KPIs (actual, promedio, pico, únicos, tiempo de escucha, uptime), series con granularidad hora/día, top de canciones/artistas/videos/DJs, heatmap día×hora y export CSV.
- Mover el selector de **zona horaria** de la parrilla de streaming a **Datos básicos**; la analítica agrupa los días en la zona del cliente.
- **BREAKING**: retirar `/dashboard/streaming/stats` y su API; reemplazados por la nueva sección.
- Retirar el campo muerto `radio_streams.listenerCount` (se lee en el admin pero nunca se escribe).
- Habilitar **logging a archivo de Caddy** en los nodos de streaming (mounts de radio y video) para que los nodos remotos alimenten las sesiones.
- Corregir el **drift de esquema Prisma**: `play_history` y `video_play_history` existen por SQL crudo del agente pero no como modelos.

## Capabilities

### New Capabilities

- `analytics/collection`: recolección de audiencia (snapshots de radio y TV) y de sesiones (parseo del access log de Caddy), con fuentes, intervalos e idempotencia.
- `analytics/rollups`: agregación horaria/diaria en zona horaria del cliente, definiciones de métricas (tiempo de escucha, únicos, pico, uptime) y retención por capas.
- `analytics/geoip`: resolución de país/ciudad y clasificación de dispositivo/navegador a partir de la sesión.
- `analytics/dashboard`: API de lectura y la sección `/dashboard/estadisticas` con tabs, KPIs, series, top, heatmap y CSV.
- `client-settings/timezone`: la zona horaria del cliente se configura en Datos básicos y aplica a parrilla y analítica.

### Modified Capabilities

<!-- Sin cambios de requisitos en specs existentes: la métrica de monitoreo en vivo (admin/monitoring) se mantiene. -->

## Impact

- **Agente de streaming** (`streaming/agent/*`): nuevas tablas y crons (snapshots, parseo de sesiones, rollups, retención), dependencia `geoip-lite`. Tocar el agente obliga a pulsar **"Actualizar nodo"** en los nodos remotos tras el deploy.
- **Base de datos MySQL**: nuevas tablas `listener_samples`, `viewer_samples`, `listener_sessions`, `viewer_sessions`, `metrics_hourly`, `metrics_daily`; modelos Prisma nuevos (incluye `play_history` y `video_play_history`); se retira `stream_stats` (o se deja de usar y se purga por retención).
- **Panel**: sección nueva `/dashboard/estadisticas`, API `/api/dashboard/analytics/*`, se elimina `/dashboard/streaming/stats` y `/api/dashboard/streaming/stats`; `TimezoneSelector` se mueve a Datos básicos.
- **Infra**: `deploy/Caddyfile.node` requiere logging a archivo; el panel ya loguea (`stream-access.log`).
- **Sin cambios de requisitos** en specs existentes.
