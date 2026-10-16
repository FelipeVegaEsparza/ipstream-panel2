# Design

## Context

Ver `proposal.md - Why`. Estado actual relevante para el diseño:

- El agente de streaming corre en cada nodo y ya usa el mismo MySQL que el panel (`streaming/agent/lib/db.js`); ya tiene crons (`startStatsCron`, `startHistoryCron`, `startRetentionCron`) y resuelve su propio `serverId` (`lib/self-server.js`, usado en `routes/monitor.js`).
- **Icecast está detrás de Caddy** tanto en el panel (`stream.<dominio>` → `icecast:8000`, log a `/data/stream-access.log`) como en los nodos (`Caddyfile.node`, `handle { reverse_proxy icecast:8000 }`). Por eso Icecast solo ve la IP del proxy y la IP real del oyente está únicamente en el access log de Caddy.
- Ya existe el patrón de lectura del log de Caddy para contar espectadores de video (`lib/video-viewers.js`, IPs únicas del `.m3u8` en ventana de 30 s).
- El panel renderiza gráficos con `recharts` y lee la DB con Prisma. El modelo `StreamStat` existe pero no se usa vía Prisma; `play_history` y `video_play_history` existen solo por SQL crudo (drift).
- Retención actual de datos de audiencia: 90 días (`lib/retention.js`).

## Goals / Non-Goals

**Goals:**
- Histórico fiel de audiencia de radio y TV, con granularidad de 1 minuto cruda y rollups horario/diario.
- Sesiones por oyente con IP real, duración, dispositivo y ubicación aproximada.
- Analítica alineada a la zona horaria del cliente, con métricas comparables entre períodos.
- Una sección única con tabs Radio | TV, sin duplicar la lógica de métricas.

**Non-Goals:**
- Tracking en tiempo real de oyentes conectados ahora mismo (eso sigue en `admin/monitoring` vía Icecast).
- Migrar o preservar los datos históricos de `stream_stats` (se descartan).
- Analítica de audiencia por usuario identificado (los oyentes son anónimos).
- Geolocalización exacta (solo país/ciudad aproximados).

## Decisions

### Recolección híbrida: Icecast para concurrencia, Caddy para sesiones
- **Decisión**: la concurrencia/pico se muestrea desde `status-json.xsl` de Icecast; las sesiones (IP real, duración, UA, bytes) se derivan del access log de Caddy.
- **Por qué**: Icecast, detrás de Caddy, no ve la IP real del oyente; cualquier conteo de únicos/geo basado en Icecast sería falso. Caddy sí tiene la IP real y además registra `duration` y `size` por request.
- **Alternativas descartadas**: Icecast `listener_add`/`listener_remove` (auth-http) da eventos en tiempo real pero IP del proxy → inútil para únicos/geo; requerir "Actualizar nodo" y tocar `icecast.xml` sin beneficio.

### Muestreo de 1 minuto con marca `online`, no solo "al aire"
- **Decisión**: cada stream habilitado genera una muestra por minuto, incluso apagado (`online = false`, 0 audiencia).
- **Por qué**: sin las muestras apagadas, el promedio queda sesgado a los ratos al aire y no se puede medir uptime. El promedio pasa a ser sobre el período completo.
- **Alternativa descartada**: muestrear solo con source activo (como hoy) — mismo sesgo que buscamos eliminar.

### Series de tiempo: una fila por bucket, guardado en UTC
- **Decisión**: guardar muestras y sesiones crudas en UTC; rollups horarios en UTC; el rollup diario se alinea a la zona del cliente.
- **Por qué**: el almacenamiento neutro evita ambigüedad; la alineación por zona se hace donde corresponde (el día del cliente). Se prefiere calcular los límites de bucket en Node con `Intl.DateTimeFormat` en lugar de `CONVERT_TZ` de MySQL, porque la imagen MySQL no trae cargadas las tablas de zonas horarias.
- **Alternativa descartada**: `CONVERT_TZ` en SQL (depende de `mysql.time_zone*` cargadas) y bucketear por la zona del navegador (origen del off-by-one actual).

### Modelo de datos
Nuevas tablas (creadas por el agente con `CREATE TABLE IF NOT EXISTS`, como el resto):

- `listener_samples(id, clientId, radioStreamId, listeners, peak, online, bitrate, title, artist, timestamp)`
- `viewer_samples(id, clientId, videoStreamId, viewers, online, timestamp)`
- `listener_sessions(id, clientId, radioStreamId, ip, country, city, device, browser, userAgent, bytes, startedAt, durationSeconds, signature UNIQUE)`
- `viewer_sessions(id, clientId, videoStreamId, ip, country, city, device, browser, userAgent, bytes, startedAt, durationSeconds, signature UNIQUE)`
- `metrics_hourly(clientId, service, bucketStartUtc, listenersAvg, listenersMax, listenerMinutes, sessions, airtimeSeconds, uniqueListeners, PRIMARY KEY(clientId, service, bucketStartUtc))`
- `metrics_daily(clientId, service, dayLocal, tz, listenersAvg, listenersMax, listenerMinutes, sessions, airtimeSeconds, uniqueListeners, PRIMARY KEY(clientId, service, dayLocal))`

Se agregan modelos Prisma equivalentes y los que faltan (`PlayHistory`, `VideoPlayHistory`).

### Idempotencia del parseo de logs
- **Decisión**: cada sesión lleva una `signature` (hash de `ts + ip + mount + bytes + duration`) con índice único; el insert ignora duplicados. El parseo avanza por marca de tiempo/cursor por nodo y log.
- **Por qué**: el agente puede reiniciarse o reprocesar un tramo; la firma evita sesiones duplicadas sin necesidad de recordar cada línea.

### Rollups y zona horaria
- **Decisión**: el nodo main calcula rollups horarios (UTC) y diarios (día local del cliente) cada 5 minutos, recalculando la última ventana con upserts idempotentes (así el dashboard se actualiza pronto en vez de esperar al cambio de hora). Al cambiar la zona del cliente se recalculan sus `metrics_daily` (costo bajo, un cliente). La agregación de rangos largos usa `metrics_daily`; la de períodos cortos usa `metrics_hourly`.
- **Por qué**: mantiene la consulta barata y evita recalcular todo el histórico; solo el día local depende de la zona.
- **Nota**: `uniqueListeners` no es aditivo, por eso vive en `metrics_daily` (y por eso no se puede derivar solo de `metrics_hourly`).

### Pico
- **Decisión**: el pico es `MAX(listeners)` de las muestras del bucket, no el `listener_peak` de Icecast.
- **Por qué**: `listener_peak` de Icecast es acumulado desde que se conectó el source y no refleja el período.

### GeoIP y dispositivo en la recolección
- **Decisión**: resolver país/ciudad con `geoip-lite` (DB local, sin key) y clasificar dispositivo/navegador con `ua-parser-js`, al momento de registrar la sesión. La IP solo se guarda en la sesión cruda y no se expone en la API.
- **Por qué**: se evita latencia y dependencia de servicios externos en cada request; el dato queda resuelto y la UI nunca muestra IPs.
- **Alternativa descartada**: MaxMind GeoLite2 (más preciso, pero requiere license key y refresh mensual); GeoIP en tiempo de consulta (repetiría trabajo y expondría IPs al panel).

### Lectura directa desde el panel
- **Decisión**: el panel lee `metrics_*` con Prisma (misma DB) y NO proxya al agente para la analítica; el agente solo escribe.
- **Por qué**: rollups ya agregados → consultas baratas; evita roundtrip y acopla menos. El proxy al agente se mantiene solo donde ya existe (estado en vivo).

### Retiros
- **Decisión**: dejar de escribir `stream_stats`, eliminar su modelo Prisma y sus relaciones; eliminar `radio_streams.listenerCount`.
- **Por qué**: `stream_stats` queda reemplazado; `listenerCount` se lee en el admin pero nunca se escribe (dato muerto). Las vistas de admin pasan a usar el estado en vivo ya disponible (`/api/admin/streaming-status`).

### Logging de Caddy en nodos
- **Decisión**: agregar en `deploy/Caddyfile.node` un log de acceso a archivo (`/data/access.log`) para el sitio del nodo, de modo que radio y video alimenten sesiones desde el nodo.
- **Por qué**: hoy el nodo no loguea a archivo; sin esto, la recolección de sesiones no funciona en nodos remotos.

## Risks / Trade-offs

- [Caddy escribe la línea del request al completarse] → las sesiones largas aparecen al desconectar (lag potencial de horas). Mitigación: la concurrencia en vivo sigue viniendo de Icecast; el histórico es correcto aunque con retraso.
- [Rotación del log de Caddy (10 MB, 5 archivos) puede perder sesiones si el parser está caído] → parsear cada minuto, mantener el cursor y aumentar `roll_keep` si fuese necesario.
- [Base `geoip-lite` desactualizada] → aceptable para país/ciudad aproximados; refrescar con actualización de dependencia periódica.
- [Privacidad de IPs] → IP solo en sesión cruda, retención 30 días, sin exposición en API/UI.
- [Multi-nodo: duplicación o huecos por desalineación de `serverId`/reloj] → filtrar por `serverId` propio (patrón existente) y usar la firma única.
- [Costo de muestreo por minuto] → inserciones por lote, índices `(clientId, timestamp)` y retención por capas.
- [Consumidores actuales de `stream_stats`/`listenerCount`] → inventariar y migrar antes de eliminar (admin/streaming, dashboard overview).

## Migration Plan

1. **Agente**: crear tablas, colector de muestras y sesiones, rollups y retención; añadir `geoip-lite` y `ua-parser-js`. Desplegar y pulsar **"Actualizar nodo"** en cada nodo remoto.
2. **Panel**: modelos Prisma, API `/api/dashboard/analytics/*`, sección `/dashboard/estadisticas` con tabs; redirigir la ruta antigua.
3. **Timezone**: mover el selector a Datos básicos.
4. **Limpieza** (tras acumular datos): dejar de escribir/eliminar `stream_stats` y `radio_streams.listenerCount`, ajustar vistas de admin.
- **Rollback**: revertir el panel (la ruta antigua vuelve) y detener los crons del agente; las tablas nuevas quedan inertes.

## Open Questions

- ¿La sección de analítica debe estar también disponible para el rol ADMIN por cliente, o solo para el cliente?
- ¿Se expone el detalle geográfico (top países) en la tab TV además de en Radio?
