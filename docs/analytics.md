# Analítica de radio y TV

Sección del cliente: `/dashboard/estadisticas` (tabs **Radio | TV**). La antigua
`/dashboard/streaming/stats` redirige allí.

## Pipeline

```
Icecast (status-json.xsl) ──muestra 1/min──┐
                                           ├──▶ listener_samples / viewer_samples
Caddy access log ──sesiones──┐             │
                             ├─────────────┴──▶ listener_sessions / viewer_sessions
                             │
                             └──rollups 5 min──▶ metrics_hourly / metrics_daily
                                                        │
                                                        ▼
                                     /api/dashboard/analytics/* ──▶ UI
```

- **Muestras de radio**: cada minuto se lee `status-json.xsl`; se guarda
  `online`, oyentes concurrentes, pico, bitrate y metadatos.
- **Muestras de TV**: cada minuto se cuentan IPs únicas que pidieron contenido
  de reproducción del stream en una ventana reciente.
- **Sesiones**: se derivan del access log de Caddy (IP real, duración, bytes,
  user-agent). Icecast está detrás del proxy y no ve la IP real.
- **Rollups**: horarios (UTC) y diarios (día local del cliente). Retención:
  crudo 30 días, rollups 24 meses.

## Paths de log por servidor

| Servidor | Radio | TV |
|---|---|---|
| Principal (panel + Icecast + SRS) | `/data/stream-access.log` | `/data/access.log` |
| Nodo remoto | `/data/access.log` | `/data/access.log` |

En un nodo, el Caddyfile (`deploy/Caddyfile.node` y el que escribe
`lib/node-provisioner.ts`) registra radio y TV en el mismo archivo. Por eso el
`.env` del nodo debe incluir `ANALYTICS_RADIO_LOG=/data/access.log`.

## Variables de entorno del agente

| Variable | Default principal | Default nodo | Descripción |
|---|---|---|---|
| `ANALYTICS_CADDY_CONTAINER` | `ipstream-caddy` | `ipstream-caddy` | Contenedor del proxy |
| `ANALYTICS_RADIO_LOG` | `/data/stream-access.log` | `/data/access.log` | Access log de radio |
| `ANALYTICS_VIDEO_LOG` | `/data/access.log` | `/data/access.log` | Access log de TV |
| `ANALYTICS_LOG_TAIL_BYTES` | `5000000` | `5000000` | Bytes del final del log por ciclo |
| `ANALYTICS_TV_SESSION_GAP_SECONDS` | `300` | `300` | Ventana de inactividad para consolidar sesiones de TV |
| `ANALYTICS_SAMPLE_INTERVAL_MS` | `60000` | `60000` | Intervalo de muestreo |
| `ANALYTICS_ROLLUP_INTERVAL_MS` | `300000` | `300000` | Intervalo de rollups |

El compose pasa estas variables al contenedor del agente (no usa `env_file`);
si agregás una nueva, incluila también en `docker-compose.yml` y
`docker-compose.streaming.yml`.

## Definiciones de métricas

- **Promedio**: media de audiencia del período, ponderada por tiempo al aire.
  Incluye las muestras con `online = false` como audiencia 0.
- **Pico**: máximo de audiencia concurrente muestreada (no el pico acumulado de
  Icecast).
- **Tiempo**: minutos-persona = suma de audiencia concurrente × intervalo.
- **Únicos**: IPs distintas en las sesiones del período.
- **Sesiones**: peticiones de audio (radio) o sesiones consolidadas por
  espectador (TV).
- **Uptime**: segundos con source activo sobre el total del rango.

## Sesiones de TV y VOD2Live

El player puede recibir el stream por:

- SRS en vivo: `/live/<key>.m3u8` o `/dj/<key>.m3u8`.
- VOD2Live (AutoDJ por defecto): `/vod/<key>/live.m3u8` (master),
  `/vod/<key>/live/<rendition>.m3u8` (playlist viva) y `/vod/<key>/seg/...`
  (segmentos).
- `/tv/<key>.m3u8` es un 302 al recurso real; **no** se cuenta para evitar
  duplicados.

Una recarga de manifiesto no es una sesión nueva: el agente consolida por
`(IP, streamKey)` y abre una sesión nueva solo si pasó más de
`ANALYTICS_TV_SESSION_GAP_SECONDS` sin actividad.

## Despliegue

El deploy de GitHub Actions actualiza el panel y el agente del servidor
principal. Los **nodos remotos no se actualizan solos**:

1. Push a `main` y esperar el job `verify` (TypeScript + tests del panel y del
   agente).
2. En `/admin/servers`, pulsar **“Actualizar nodo”** en cada nodo remoto.
   Esto reescribe el `.env` (incluye `ANALYTICS_*`), copia el compose con el
   pass-through y reconstruye el agente.
3. Verificar en el nodo:

   ```bash
   docker exec ipstream-streaming-agent printenv | grep ANALYTICS
   docker exec ipstream-caddy ls -la /data/access.log
   ```

4. Verificar que las sesiones crecen:

   ```sql
   SELECT COUNT(*) FROM listener_sessions;
   SELECT COUNT(*) FROM viewer_sessions;
   SELECT service, SUM(sessions), SUM(uniqueListeners)
   FROM metrics_daily GROUP BY service;
   ```

## Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| Promedio/Pico muestran `—` | El período no tiene muestras o el resumen no trae el campo |
| Sesiones y Únicos en 0 | La lectura del log falló (revisar `warn` “No se pudo leer el access log” en los logs del agente) |
| Radio en 0 solo en un nodo | `ANALYTICS_RADIO_LOG` apunta a `stream-access.log`; en el nodo debe ser `/data/access.log` |
| TV en 0 con espectadores | El nodo no tiene el código nuevo (falta “Actualizar nodo”) o el playout es VOD2Live y el agente es viejo |
| Días corridos en el gráfico | El panel es viejo; los días locales se formatean en UTC y las horas con `summary.timezone` |
| `stdout maxBuffer length exceeded` | El agente es viejo; `readCaddyLog` debe pasar `maxBuffer` proporcional a `ANALYTICS_LOG_TAIL_BYTES` |

Los logs del agente se ven con:

```bash
docker logs ipstream-streaming-agent --since 1h | grep -i analytics
```
