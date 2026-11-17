# Design

## Context

La analítica ya tiene un pipeline funcionando: el agente muestrea Icecast y el log de Caddy, escribe `listener_samples`/`viewer_samples` y sesiones crudas, y calcula `metrics_hourly`/`metrics_daily`; el panel lee esos rollups en `/api/dashboard/analytics/*` y los pinta en `AnalyticsView`. La verificación en producción encontró cuatro puntos de ruptura concretos:

- El resumen de la API usa nombres de campo distintos a los que consume la UI.
- La lectura de 5 MB del access log falla por el `maxBuffer` por defecto de `child_process.exec` (1 MB) y el error se oculta en nivel debug.
- El parser de TV solo reconoce `/live/<key>.m3u8` y `/dj/<key>.m3u8`; el playout por defecto (VOD2Live) usa `/vod/<key>/live.m3u8`, playlists por rendición y segmentos.
- Los nodos remotos no reciben `ANALYTICS_RADIO_LOG` y su compose no pasa variables `ANALYTICS_*` al contenedor del agente.

Además, `resolveRange` usa ventanas móviles de 7×24 h (8 días locales), la UI formatea buckets diarios como UTC en la zona del navegador, y `recomputeDailyForClient` borra todo `metrics_daily` del cliente antes de reconstruir solo los últimos 30 días.

## Goals / Non-Goals

**Goals:**

- Que los seis KPIs muestren valores numéricos reales del período, sin `undefined` ni `NaN`.
- Que las sesiones de radio y TV se recolecten de forma confiable y que “Sesiones” y “Únicos” dejen de ser siempre 0.
- Que la audiencia de TV se mida en los dos modos de playout (SRS en vivo y VOD2Live).
- Que “7 días” y “30 días” signifiquen 7 y 30 buckets diarios en la zona del cliente.
- Que un cambio de zona horaria no destruya el histórico de rollups diarios.
- Que un nodo remoto con radio y TV en el mismo archivo de log alimente las sesiones de ambos.

**Non-Goals:**

- No se agrega la tarjeta de “audiencia actual” (el rediseño original la mencionaba; queda como follow-up).
- No se cambia el esquema de la base ni se migran datos históricos que nunca se recolectaron.
- No se reemplaza `docker exec` por un sidecar o por montar el volumen de Caddy; se mantiene el mecanismo actual con una lectura segura.
- No se rediseña la UI de estadísticas más allá de los KPIs, las fechas y los períodos.

## Decisions

### 1. Contrato del resumen: renombrar en el servidor y blindar la UI

`lib/analytics.ts` (`summarize`) pasa a devolver `listenersAvg`, `listenersMax`, `listenerMinutes`, `sessions`, `airtimeSeconds`, `uniqueListeners` y `totalBuckets`, y exporta un tipo `AnalyticsSummary` que la ruta y la vista pueden compartir con `import type` (sin arrastrar Prisma al bundle cliente).

- **Por qué renombrar y no mapear en la ruta**: el nombre `overallAvgListeners`/`allTimePeakListeners` describe una idea distinta (“histórico”) y confunde; el contrato real de la UI es por período. Un solo nombre evita que vuelva a divergir.
- **Alternativa descartada**: dejar la API como está y mapear en la ruta. Funciona, pero mantiene dos vocabularios y el siguiente consumidor vuelve a equivocarse.
- **Blindaje adicional**: un helper de la UI `formatMetric(value, fallback = '—')` convierte `undefined`/`NaN` en un marcador explícito. El test del servidor verifica las claves y los valores; el helper evita que un cambio futuro vuelva a mostrar “undefined”.

### 2. Lectura del log: subir `maxBuffer` y dejar de ocultar el error

`readCaddyLog` ejecuta `execCmd(cmd, { timeout, maxBuffer: max(tailBytes * 2, 2 MB) })` y quita el `2>/dev/null || true` que hoy convierte un archivo inexistente o un error de `docker exec` en una lista vacía. El fallo se registra con `logger.warn({ path, err })`; el ciclo siguiente reintenta. `countVideoViewers` recibe el mismo tratamiento.

- **Por qué no filtrar en el shell**: el parser necesita líneas JSON completas y el log del panel incluye tráfico que no es de streaming; un `grep` por mounts/keys reduciría el volumen, pero obliga a construir el patrón con los mounts y keys de la DB en cada ciclo. Se deja como optimización futura si el volumen crece.
- **Por qué no usar `spawn` con streaming**: es la solución más robusta a largo plazo, pero cambia más código del necesario para el fix. `maxBuffer` de 10 MB cubre el tramo actual de 5 MB con margen.
- **Archivo ausente**: distinguir “no hay archivo” de “no hubo sesiones” es parte del requisito de cobertura por nodo; el `warn` con el path lo hace visible en los logs del agente.

### 3. TV: un parser de recursos de reproducción y un consolidador de sesiones

Se agrega en `streaming/agent/lib/analytics/parse.js` un parser puro `parseVideoPlaybackRequest(uri)` que devuelve `{ streamKey, kind }` para:

| URI | kind |
|---|---|
| `/live/<key>.m3u8` | `srs-live` |
| `/dj/<key>.m3u8` | `srs-dj` |
| `/vod/<key>/live.m3u8` | `vod-master` |
| `/vod/<key>/live/<rendition>.m3u8` | `vod-media` |
| `/vod/<key>/seg/<rendition>/<track>/<file>` | `vod-segment` |
| `/api/video/playout/<key>/...` | variante interna equivalente |
| `/tv/<key>.m3u8` | se ignora (302; el recurso real se cuenta después) |

- **Concurrencia**: `countVideoViewers` cuenta IPs únicas de cualquier `kind` de reproducción en la ventana reciente. El master solo se pide una vez; las playlists por rendición y los segmentos se piden de forma continua, así que la ventana sigue viendo al espectador.
- **Sesiones**: `parseViewerEvents` (puro) devuelve eventos `{ ip, streamKey, ts, bytes, durationSeconds }`; `collectViewerSessions` los consolida con un tracker en memoria por `(ip, streamKey)` y una ventana de inactividad configurable (default 5 min). El primer evento crea la sesión; los siguientes actualizan `lastSeen`, `bytes` y `durationSeconds` (como máximo cada 30 s para no escribir en cada request); un hueco mayor a la ventana cierra la sesión y el siguiente evento crea otra.
- **Idempotencia**: la firma de la sesión es `sha256(ip|streamKey|startedAt ISO)`, así que releer el mismo tramo no duplica. El tracker evita crear una fila por recarga. Si el agente se reinicia en medio de una sesión, la sesión puede partirse en dos; se acepta ese sobreconteo menor (no afecta a `uniqueListeners`, que cuenta IPs distintas).
- **Alternativa descartada**: contar una sesión por cada petición de manifiesto (lo actual). En HLS en vivo eso produce decenas de “sesiones” por espectador y hace que la tarjeta de Sesiones no signifique nada.
- **Alternativa descartada**: derivar sesiones de TV solo de `viewer_samples`. Da sesiones por stream, no por espectador, y no permite IP ni duración.

### 4. Nodos: path de log explícito en el `.env` y pass-through en el compose

Hay dos capas que hoy faltan:

1. `buildNodeEnv` (`lib/node-provisioner.ts`) no escribe `ANALYTICS_RADIO_LOG`; el default del agente es `/data/stream-access.log`, que en un nodo no existe. Se agrega `ANALYTICS_RADIO_LOG=/data/access.log`, `ANALYTICS_VIDEO_LOG=/data/access.log` y `ANALYTICS_CADDY_CONTAINER=ipstream-caddy`.
2. El compose del agente usa `environment` explícito, no `env_file`, así que una variable en el `.env` no llega al contenedor. Se agregan los pass-through en `docker-compose.yml` (default `stream-access.log` para radio) y en `docker-compose.streaming.yml` (default `access.log` para radio y video).

- **Por qué no detectar el archivo automáticamente**: adivinar el path según lo que exista oculta errores de configuración y complica el diagnóstico. El path explícito es auditable y el `warn` de archivo ausente lo delata.
- **Operación**: como el nodo copia el código y reescribe el `.env`, el fix llega con **“Actualizar nodo”**, no con el deploy del panel.

### 5. Fechas: días locales sin corrimiento y horas en la zona del cliente

- Los buckets diarios son claves `YYYY-MM-DD` que representan un día local del cliente, no un instante. La UI los formatea con `timeZone: 'UTC'` para que el navegador no los corra un día.
- Los buckets horarios son instantes UTC; la UI los formatea con `summary.timezone` (la zona del cliente), no con la del navegador.
- `resolveRange` recibe la zona del cliente y, para `week`/`month`, calcula `from` al inicio del día local correspondiente y `to` al inicio del día siguiente al actual. `day` sigue siendo una ventana móvil de 24 h.
- **Alternativa descartada**: dejar la ventana móvil y cambiar la etiqueta a “últimos 7 días”. El producto ya dice “7 días” y el usuario espera 7 barras/buckets, no 8.
- **DST**: el cálculo del inicio del día local se hace con `Intl` y un ajuste por offset, no restando 24 h fijas; se cubre con un test para `America/Santiago` en cambio de horario.

### 6. Recalculo por zona horaria: preservar fuera de la ventana cruda

`recomputeDailyForClient` deja de hacer `DELETE` de todo el cliente. Calcula primero las filas nuevas en memoria, y en una transacción borra e inserta solo los `dayLocal` cubiertos por la ventana de datos crudos (`RAW_RETENTION_DAYS`). Los días anteriores se conservan tal como estaban, con su columna `tz` original.

- **Por qué no recalcular todo**: los datos crudos ya no existen después de 30 días; no hay forma de reagrupar esos días en la nueva zona. Borrarlos solo destruye histórico.
- **Por qué transacción**: hoy si el insert falla después del delete, el cliente queda sin rollups diarios. La transacción garantiza que se conserve lo anterior.
- **Trade-off**: el histórico anterior conserva la zona con la que se calculó. La columna `tz` lo documenta y la UI no mezcla los buckets: cada fila ya trae su día local.

## Risks / Trade-offs

- **Primera corrida con sesiones viejas** → el tramo de 5 MB puede contener días anteriores; el rollup diario las incorpora y el KPI de Sesiones puede saltar una vez. Es esperado y se documenta en la verificación.
- **Reinicio del agente en medio de una sesión de TV** → puede crear una segunda sesión. Mitigación: aceptar el sobreconteo menor; `uniqueListeners` sigue siendo correcto. Si molesta, se puede sembrar el tracker desde la DB al arrancar (follow-up).
- **Log que crece más de 5 MB por ciclo** → se pueden perder eventos entre ciclos. Mitigación: `tailBytes` configurable; monitorear el tamaño del log y subirlo si hace falta.
- **Cambio de período** → todas las rutas (`summary`, `series`, `heatmap`, `top`, `export`) deben usar el mismo `resolveRange` con la misma zona; si una queda desalineada, los totales no cuadran. Mitigación: centralizar la resolución y cubrir con tests.
- **Histórico con `tz` mixta** → tras un cambio de zona, los días viejos conservan su zona original. Es deliberado; se documenta para soporte.
- **Nodos desactualizados** → si no se pulsa “Actualizar nodo”, el agente viejo sigue con el `maxBuffer` y el path incorrecto. Mitigación: incluir la verificación de `/health` y del `.env` en el checklist de deploy.

## Migration Plan

1. Deploy del panel y del agente del VPS principal vía GitHub Actions (el gate de CI debe pasar).
2. Pulsar **“Actualizar nodo”** en cada nodo remoto (Radio VPS 1, Tv VPS 1): reescribe `.env` con `ANALYTICS_*`, copia el compose con el pass-through y reconstruye el agente.
3. Verificar en cada nodo: `docker exec ipstream-streaming-agent printenv | grep ANALYTICS` y `docker exec ipstream-caddy ls -la /data/access.log`.
4. Verificar en la DB que `listener_sessions`/`viewer_sessions` crecen y que `metrics_daily` incorpora `sessions`/`uniqueListeners`.
5. Abrir `/dashboard/estadisticas` con un cliente con datos: Promedio/Pico numéricos, fechas sin corrimiento, y TV con espectadores si hay reproducción.
6. Rollback: revertir el panel y volver a pulsar “Actualizar nodo” para que los nodos reciban el código anterior. No hay migraciones de esquema, así que el rollback es seguro.

## Open Questions

- **Umbral de inactividad de sesiones de TV**: se propone 5 min configurable (`ANALYTICS_TV_SESSION_GAP_SECONDS`). Se puede ajustar sin cambiar el diseño.
- **Tamaño del tramo de log**: mantener 5 MB o subir a 10 MB si los nodos con más tráfico pierden eventos. Se decide con métricas después del deploy.
- **Audiencia actual**: la tarjeta no existe; si se quiere, se puede agregar leyendo la última muestra del stream. Queda fuera de este cambio.
