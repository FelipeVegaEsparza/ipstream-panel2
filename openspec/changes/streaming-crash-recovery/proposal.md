# Streaming Crash Recovery

## Why

Los streams de radio dejan de transmitir con HTTP 404 cuando el proceso Liquidsoap muere. La investigación en producción (nodo `audio1.ipstream.cl`, 2026-09-15) determinó que Liquidsoap 2.4.5 crashea con `PANIC: Liquidsoap has crashed, exiting.` por `Sys_error("Bad file descriptor")` en `Process_handler.run`, disparado por los callbacks `system("curl ... &>/dev/null &")` que el agente inyecta en cada `.liq`. El supervisor detecta la muerte pero solo marca el stream `off`: no lo reinicia, por lo que el 404 queda permanente hasta que un operador lo levanta a mano (caídas de 28 h y ~4 días observadas).

## What Changes

- **Eliminar el uso de `system()` con subproceso en background** en los callbacks generados (harbor `on_connect`/`on_disconnect` y `on_track`/track-started), reemplazándolo por un mecanismo que no pueda tumbar el proceso (request HTTP nativo de Liquidsoap, o `process.run` sin `&`/redirección de shell, según disponibilidad en 2.4.5).
- **Auto-recuperación de streams caídos**: el supervisor, al detectar que un stream marcado `running` ya no tiene proceso, SHALL reiniciarlo automáticamente con backoff y tope de intentos, en lugar de solo marcarlo `off`.
- **Distinguir caída de parada intencional**: un stream detenido por el operador/admin no debe reiniciarse solo.
- **Supervisión acotada al propio servidor**: el `dj-watcher` y cualquier chequeo por telnet SHALL filtrar por `serverId` para no sondear streams que corren en otros nodos.
- **Auditoría**: cada reinicio automático (y cada abandono tras agotar reintentos) SHALL quedar registrado en `streaming_audit_logs`.

## Capabilities

### New Capabilities
- `streaming-recovery`: resiliencia del AutoDJ de radio — callbacks que no crashean Liquidsoap, reinicio automático de streams caídos con backoff, y supervisión acotada al servidor propio.

### Modified Capabilities
<!-- Sin cambios de requisitos en capacidades existentes. -->

## Impact

- **Código**: `streaming/agent/lib/script-generator.js` (callbacks), `streaming/agent/lib/stream-supervisor.js` (auto-restart), `streaming/agent/lib/dj-watcher.js` (filtro `serverId`), `streaming/agent/lib/liquidsoap.js` (reuso de `startStream`/`restartStream`), `streaming/agent/lib/dj-state.js` (reconciliación).
- **Datos**: `radio_streams` (estado/contadores de reintento si se agregan columnas), `streaming_audit_logs` (nuevas acciones).
- **Operación**: los nodos remotos requieren pulsar "Actualizar nodo" tras el deploy (toca `streaming-agent` y scripts de Liquidsoap).
- **Riesgo**: reiniciar un stream mientras un DJ está en vivo podría cortar la transmisión; el auto-restart debe respetar el estado `live`/harbor.
