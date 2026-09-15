## Context

Ver `proposal.md - Why` para la motivación y la evidencia del crash. Restricciones relevantes:

- Los callbacks viven en el `.liq` generado por `streaming/agent/lib/script-generator.js` y se disparan desde `on_connect`/`on_disconnect` (harbor) y `autodj.on_track`.
- El agente corre como sidecar y ya puede ejecutar `docker exec` sobre el contenedor Liquidsoap; `startStream`/`restartStream`/`stopStream` ya existen en `lib/liquidsoap.js`.
- Arquitectura multi-servidor: cada nodo tiene su propio agente y su propio `serverId` resuelto por `resolveSelfServerId()`; el panel central es la fuente de verdad en MySQL.
- El agente ya usa auto-migración de esquema al arrancar (`server.js` con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Liquidsoap 2.4.5 incluye los builtins HTTP nativos (`http.get`/`http.post`, basados en cohttp), sin subproceso.

## Goals / Non-Goals

**Goals:**
- Que ningún callback generado pueda terminar el proceso Liquidsoap.
- Recuperar automáticamente un stream caído, acotando reintentos y sin cortar transmisiones en vivo ni pisar decisiones del operador.
- Que la supervisión no toque streams de otros nodos.

**Non-Goals:**
- No se cubre el AutoDJ de TV/video (SRS + FFmpeg): su recuperación es un problema distinto.
- No se rediseña el supervisor como orquestador de alta disponibilidad (sin múltiples réplicas, sin health-check externo).
- No se cambia el modelo de datos de streams ni la UI del panel más allá de lo mínimo para exponer el estado.

## Decisions

### D1: Callbacks vía HTTP nativo de Liquidsoap, no `system()`/shell
Reemplazar `system("curl ... &>/dev/null &")` por `http.post(url, "", headers)` (o el equivalente async disponible en 2.4.5) con `X-Harbor-Token`. Se elimina el subproceso y la redirección de shell, que es lo que dispara `Sys_error("Bad file descriptor")` en `Process_handler`.
- **Alternativas**: (a) `process.run` sin `&` — sigue usando `Process_handler`, mismo riesgo latente; (b) quitar los callbacks y derivar `elapsed`/estado por polling — pierde precisión de `on_track` y agrega carga; (c) mantener `system` pero con `catch` — la excepción ocurre en una cola `Duppy` y no es capturable de forma fiable.
- **Riesgo de bloqueo**: `http.post` es síncrono; se usa timeout corto (agente en la misma red Docker) y se mantiene el token en header.

### D2: Auto-recuperación en el supervisor, no en el panel
El `stream-supervisor` (que ya corre cada 60 s por nodo y ya filtra por `serverId`) pasa de "marcar off" a "reintentar levantar". Reutiliza `startStream`/`restartStream` del agente, evitando round-trips al panel y manteniendo el control local al nodo.
- **Alternativas**: (a) un cron en el panel que llame a los agentes — agrega latencia y acopla el panel a la topología; (b) un watchdog externo (systemd/docker) — no conoce el estado de negocio (DJ en vivo, enabled).

### D3: Backoff y tope en memoria, con auditoría
Mapa `clientId -> { attempts, nextAttemptAt }` en el agente. Secuencia de espera creciente (p. ej. 15 s, 30 s, 60 s, 2 m, 5 m), tope de intentos (p. ej. 6). Éxito resetea el contador. Al agotar, marca `off` y audita. El estado no necesita persistir: un reinicio del agente reinicia la ventana, y `autoStartStreams` cubre ese caso.
- **Alternativas**: persistir contadores en DB — más columnas y sin beneficio claro.

### D4: Distinguir caída de parada intencional con `autoRestart`
Nueva columna `radio_streams.autoRestart BOOLEAN NOT NULL DEFAULT true`. `stopStream` la pone en `0`; `startStream`/`restartStream` en `1`. El supervisor solo reinicia si `enabled = 1 AND autoRestart = 1`. Así una parada manual (o un kill switch) no se revierte sola.
- **Alternativas**: (a) reusar `autoStart` — semántica distinta (arranque al boot vs recuperación); (b) inferir de `status='off'` — no distingue caída de parada.

### D5: Exigir dos detecciones consecutivas antes de reiniciar
`isProcessRunning` devuelve `running:false` también cuando falla el `docker exec` (falso negativo). Antes de reiniciar se exige que el proceso siga ausente en dos chequeos consecutivos y que no haya DJ conectado (telnet). Esto evita reinicios por fallos transitorios del daemon.
- **Alternativas**: reintentar el `docker exec` — útil pero insuficiente; la doble detección es más robusta y barata.

### D6: Acotar `dj-watcher` al `serverId` propio
`lib/dj-watcher.js` hoy consulta `WHERE liquidsoapRunning = 1` sin filtrar; se agrega `resolveSelfServerId()` y el mismo criterio que el supervisor (`serverId = ?` o `IS NULL` legacy). Elimina el sondeo telnet a streams de otros nodos.

## Risks / Trade-offs

- [Reinicio en bucle si el `.liq` es inválido] → backoff exponencial + tope + auditoría; el operador ve el motivo en el panel.
- [Corte de un DJ en vivo por falso negativo] → no reiniciar si hay harbor conectado (D5) y exigir doble detección.
- [Bloqueo del clock por `http.post`] → timeout corto; el agente es local; los callbacks de harbor son esporádicos.
- [Nodos remotos desactualizados] → el deploy de GH Actions no toca nodos; documentar que hay que pulsar "Actualizar nodo" tras desplegar (toca `streaming-agent` y scripts).
- [Columna nueva en DB] → auto-migración idempotente en `server.js`; los streams existentes toman `autoRestart=true`, que es el comportamiento deseado.

## Migration Plan

1. Deploy del panel + agente principal (GH Actions).
2. En cada nodo de streaming remoto, pulsar **"Actualizar nodo"** para re-desplegar agente y scripts con los callbacks nuevos y el supervisor con auto-recuperación.
3. Verificar: stream caído se recupera solo y queda auditado; un stream detenido a mano no revive.
4. Rollback: revertir el commit y re-desplegar; la columna `autoRestart` es inofensiva si el código viejo la ignora.
