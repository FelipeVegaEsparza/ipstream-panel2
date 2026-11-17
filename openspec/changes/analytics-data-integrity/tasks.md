# Tasks

## 1. Contrato del resumen y KPIs

- [x] 1.1 En `lib/analytics.ts`, renombrar los campos de `summarize` a `listenersAvg`, `listenersMax`, `listenerMinutes`, `sessions`, `airtimeSeconds`, `uniqueListeners` y `totalBuckets`, y exportar un tipo `AnalyticsSummary`; verificar que `npx tsc --noEmit` compila sin errores.
- [x] 1.2 Crear `lib/analytics-format.ts` con un helper `formatMetric(value, fallback = '—')` que convierta `undefined`/`NaN` en el fallback; agregar `lib/analytics-format.test.ts` y verificar con `npm test`.
- [x] 1.3 En `AnalyticsView.tsx`, consumir el tipo `AnalyticsSummary` con `import type` y usar `formatMetric` en las tarjetas de Promedio y Pico (y en el resto de KPIs numéricos); verificar con `npx tsc --noEmit` y una prueba manual con un valor nulo.
- [x] 1.4 Agregar `lib/analytics.test.ts` con un test del contrato de `summarize` sobre puntos sembrados: claves exactas, promedio ponderado, pico y suma de minutos/sesiones; verificar con `npm test`.

## 2. Fechas y períodos

- [x] 2.1 Mover `fmtBucket` a `lib/analytics-format.ts` y hacer que los buckets diarios (`YYYY-MM-DD`) se formateen con `timeZone: 'UTC'` y los horarios con la zona del cliente (`summary.timezone`); agregar tests para `America/Santiago` (el 17 de noviembre no debe mostrarse como 16) y para un bucket de 14:00 UTC visto desde otra zona; verificar con `npm test`.
- [x] 2.2 Cambiar `resolveRange` para recibir la zona del cliente y alinear `week`/`month` al inicio del día local (7 y 30 buckets diarios, respectivamente); agregar tests para 7/30 buckets y para un día con cambio de horario (DST) en `America/Santiago`; verificar con `npm test`.
- [x] 2.3 Actualizar `summary`, `series`, `heatmap`, `top` y `export` para resolver la zona antes que el rango y usar la misma ventana; verificar que las cinco rutas devuelven el mismo `from`/`to` para el mismo `period` (test de integración o comparación de respuestas).
- [x] 2.4 Pasar `summary.timezone` a `fmtBucket` en la serie y en el tooltip del gráfico; verificar con `npx tsc --noEmit` y revisando que el eje use la zona del cliente.

## 3. Ingesta confiable de logs (agente)

- [x] 3.1 En `streaming/agent/lib/analytics/collect.js`, hacer que `readCaddyLog` pase `maxBuffer` proporcional a `tailBytes` (mínimo 2 MB de margen), quite el `2>/dev/null || true` que oculta errores y registre `logger.warn({ path, err })` cuando la lectura falla; verificar con un test que simula un stdout de 5 MB y otro que simula un error, ambos en `streaming/agent && npm test`.
- [x] 3.2 Aplicar el mismo `maxBuffer` y manejo de error a `countVideoViewers` en `streaming/agent/lib/video-viewers.js`; verificar que un log de prueba de 2 MB no lanza `stdout maxBuffer length exceeded`.
- [x] 3.3 Exponer `ANALYTICS_LOG_TAIL_BYTES` en la configuración del agente y documentar el default de 5 MB; verificar que el valor llega al contenedor con `docker compose config` o con un test de `config.js`.

## 4. TV: VOD2Live y sesiones consolidadas

- [x] 4.1 Agregar `parseVideoPlaybackRequest(uri)` en `streaming/agent/lib/analytics/parse.js` que reconozca `/live/<key>.m3u8`, `/dj/<key>.m3u8`, `/vod/<key>/live.m3u8`, `/vod/<key>/live/<rendition>.m3u8`, `/vod/<key>/seg/...` y las variantes `/api/video/playout/...`, e ignore `/tv/<key>.m3u8`; agregar tests para cada caso en `streaming/agent/test/analytics-sessions.test.js` y verificar con `npm test`.
- [x] 4.2 Actualizar `countVideoViewers` para usar el parser y contar IPs únicas de reproducción (SRS y VOD2Live) en la ventana reciente, incluyendo playlists por rendición y segmentos; verificar con un log sembrado que un espectador que solo recarga playlists/segmentos sigue contando.
- [x] 4.3 Agregar `parseViewerEvents(lines, keyMap)` (puro) que devuelva eventos de reproducción con IP, streamKey, timestamp, bytes y duración; agregar tests de parseo y de descarte de URIs ajenas; verificar con `npm test`.
- [x] 4.4 Implementar un `SessionTracker` en memoria por `(ip, streamKey)` con ventana de inactividad configurable (default 5 min), actualización acotada de `durationSeconds`/`bytes` y firma determinista `sha256(ip|streamKey|startedAt)`; agregar tests de consolidación, nueva sesión tras el hueco e idempotencia al releer el mismo tramo; verificar con `npm test`.
- [x] 4.5 Conectar `collectViewerSessions` al tracker y a `parseViewerEvents`, con upsert idempotente por firma (`INSERT ... ON DUPLICATE KEY UPDATE`) para actualizar duración/bytes sin crear otra fila; verificar con un log sembrado que N recargas de una IP producen una sola fila en `viewer_sessions`.
- [x] 4.6 Agregar `ANALYTICS_TV_SESSION_GAP_SECONDS` a la configuración del agente y al pass-through del compose; verificar el default de 300 s y que un valor distinto se refleja en la sesión consolidada.

## 5. Nodos y configuración de logs

- [x] 5.1 Agregar el pass-through de `ANALYTICS_RADIO_LOG`, `ANALYTICS_VIDEO_LOG`, `ANALYTICS_CADDY_CONTAINER`, `ANALYTICS_LOG_TAIL_BYTES` y `ANALYTICS_TV_SESSION_GAP_SECONDS` en `docker-compose.yml` y `docker-compose.streaming.yml`; verificar con `docker compose config` que radio usa `stream-access.log` en el principal y `access.log` en los nodos.
- [x] 5.2 En `lib/node-provisioner.ts`, escribir `ANALYTICS_RADIO_LOG=/data/access.log`, `ANALYTICS_VIDEO_LOG=/data/access.log` y `ANALYTICS_CADDY_CONTAINER=ipstream-caddy` en el `.env` del nodo; agregar un test del generador de `.env` o verificar el contenido generado en un dry-run.
- [x] 5.3 Documentar en `docs/analytics.md` (nuevo) los paths de log por tipo de servidor, la ventana de sesiones de TV y el paso obligatorio **“Actualizar nodo”**; verificar que las rutas y defaults del documento coinciden con los compose y con `config.js`.

## 6. Recalculo por zona horaria

- [x] 6.1 Cambiar `recomputeDailyForClient` para calcular primero las filas nuevas y, en una transacción, borrar e insertar solo los `dayLocal` cubiertos por `RAW_RETENTION_DAYS`, conservando los días anteriores; agregar un test con filas diarias más antiguas que la ventana cruda y verificar que siguen existiendo después del recalculo (`streaming/agent && npm test`).
- [x] 6.2 Verificar que la ruta `app/api/dashboard/settings/timezone` sigue llamando a `recomputeAnalyticsDaily` y que un error del agente se propaga al usuario sin borrar rollups; agregar o ajustar el test correspondiente y ejecutar `npm test`.

## 7. Integración y despliegue

- [x] 7.1 Ejecutar el gate de CI completo en local: `npx tsc --noEmit`, `npm test` y `cd streaming/agent && npm test`; verificar que los tres pasan.
- [ ] 7.2 Deployar a `main` y esperar el job `verify` de GitHub Actions; si falla, no continuar con la actualización de nodos.
- [ ] 7.3 Pulsar **“Actualizar nodo”** en Radio VPS 1 y Tv VPS 1; verificar en cada nodo `docker exec ipstream-streaming-agent printenv | grep ANALYTICS` y `docker exec ipstream-caddy ls -la /data/access.log`.
- [ ] 7.4 Verificación en producción (solo lectura): `listener_sessions`/`viewer_sessions` crecen, `metrics_daily` incorpora sesiones y únicos, y `/dashboard/estadisticas` muestra Promedio/Pico numéricos, días sin corrimiento y TV con espectadores cuando hay reproducción.
