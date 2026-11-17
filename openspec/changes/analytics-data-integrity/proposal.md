# Proposal

## Why

La sección `/dashboard/estadisticas` muestra rollups reales, pero no es confiable: las tarjetas **Promedio** y **Pico** dicen `undefined`, **Sesiones** y **Únicos** están siempre en 0, y la audiencia de TV no se cuenta en el modo de playout por defecto. La verificación en producción confirmó causas concretas: un contrato roto entre la API y la UI, la lectura del access log de Caddy falla por el límite de `maxBuffer` de `child_process.exec`, el recolector de TV no reconoce las URLs de VOD2Live (`/vod/...`), y los nodos remotos no reciben el path del log de radio. Además, los días del gráfico se muestran corridos para clientes fuera de UTC.

El resultado es que el cliente ve datos incompletos o “rotos” y no puede confiar en la sección. Como las specs de analítica del cambio `analytics-redesign` nunca se sincronizaron a `openspec/specs/`, este cambio también las establece como baseline corregido.

## What Changes

- **Contrato de KPIs**: alinear la respuesta de `/api/dashboard/analytics/summary` con lo que consume la UI (`listenersAvg`, `listenersMax`) y cubrir el contrato con un test.
- **Ingesta de logs confiable**: corregir la lectura del access log de Caddy para que no falle por `maxBuffer`; registrar el fallo en nivel visible y no devolver silenciosamente listas vacías.
- **TV en VOD2Live**: reconocer manifiestos y segmentos servidos como `/vod/<key>/live.m3u8`, `/vod/<key>/live/<rendition>.m3u8` y `/vod/<key>/seg/...`; contar espectadores concurrentes por IP y definir sesiones de TV sin inflarlas con cada recarga del manifiesto.
- **Nodos remotos**: escribir explícitamente `ANALYTICS_RADIO_LOG` (y el path de video) en el `.env` del nodo, porque su Caddy escribe radio y TV en `/data/access.log`.
- **Fechas y períodos**: formatear días locales sin corrimiento de zona horaria y horas con la zona del cliente; alinear “7 días” y “30 días” a días locales para que no aparezcan 8/31 buckets.
- **Recalculo por zona horaria**: al cambiar la zona, recalcular solo la ventana cubierta por datos crudos sin borrar el histórico de `metrics_daily` anterior a esa ventana.
- **Cobertura de pruebas**: test del shape del summary y del formateo de fechas en el panel; tests del parser de URLs de TV y de la deduplicación de sesiones en el agente.
- **Sin cambios** en el modelo de datos ni en las rutas públicas: se reutilizan `listener_samples`, `viewer_samples`, `listener_sessions`, `viewer_sessions`, `metrics_hourly` y `metrics_daily`.

## Capabilities

### New Capabilities

- `analytics/collection`: muestreo de audiencia de radio y TV, sesiones desde el access log de Caddy, ingesta confiable de logs, reconocimiento de URLs de TV (SRS y VOD2Live) y recolección acotada por nodo con sus paths de log.
- `analytics/rollups`: rollups horarios y diarios en la zona del cliente, definiciones de promedio/pico/tiempo/únicos/sesiones/uptime, retención por capas y recalculo por cambio de zona horaria sin pérdida de histórico.
- `analytics/dashboard`: sección `/dashboard/estadisticas` con tabs, períodos, KPIs con contrato estable, series, rankings, heatmap, exportación y formateo de fechas en la zona del cliente.

### Modified Capabilities

<!-- Ninguna: las capacidades de analítica no existen aún en openspec/specs; se establecen aquí como baseline corregido. -->

## Impact

- **Panel**: `lib/analytics.ts`, `app/api/dashboard/analytics/*`, `components/dashboard/analytics/AnalyticsView.tsx`, `lib/dashboard-i18n.ts` (si se agregan etiquetas) y tests nuevos.
- **Agente de streaming**: `streaming/agent/lib/analytics/*` (collect, parse, rollups), `streaming/agent/lib/video-encoder.js` (opciones de `exec`), `streaming/agent/lib/video-viewers.js` y tests del agente.
- **Provisionamiento de nodos**: `lib/node-provisioner.ts` (`.env` del nodo) y `deploy/Caddyfile.node` si se ajusta el logging.
- **Operación**: tocar `streaming/agent/*` y el provisionador obliga a pulsar **“Actualizar nodo”** en cada nodo remoto después del deploy; el path del log de radio no se corrige solo con el deploy del panel.
- **Datos**: no hay migraciones de esquema; las sesiones históricas no recolectadas no se recuperan completas (solo lo que quede en el tramo de log leído al momento del fix). Los rollups diarios se recalculan desde las muestras crudas disponibles.
- **Riesgo**: al corregir la ingesta, la primera ejecución puede insertar sesiones de radio de días anteriores que aún estén en el log; el recalculo diario las incorporará.
