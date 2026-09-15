## 1. Callbacks que no crashean Liquidsoap

- [x] 1.1 Verificar en el contenedor `ipstream-liquidsoap` (v2.4.5) que exista el builtin HTTP nativo y su firma/headers (p. ej. `liquidsoap -h http.post` o `http.post.async`), y documentar la variante elegida; verificación: salida del `-h` mostrando el builtin disponible.
- [x] 1.2 Reemplazar en `streaming/agent/lib/script-generator.js` los `system("curl ... &>/dev/null &")` de los callbacks de harbor (`on_connect`/`on_disconnect`) y de `on_track`/track-started por la llamada HTTP nativa elegida, con timeout corto y header `X-Harbor-Token`; verificación: generar un `.liq` y confirmar que no queda ninguna llamada `system(`.
- [x] 1.3 Probar en local un stream con tracks y jingles durante varios ciclos de track y confirmar que el proceso sigue vivo y que los callbacks llegan al agente; verificación: el log de Liquidsoap no contiene `Bad file descriptor` ni `PANIC`, y `/api/streams/:clientId/status` reporta el proceso corriendo.

## 2. Auto-recuperación de streams caídos

- [x] 2.1 Agregar `radio_streams.autoRestart BOOLEAN NOT NULL DEFAULT true` con auto-migración idempotente en `streaming/agent/server.js`; verificación: la columna existe en la DB y los streams existentes toman `true`.
- [x] 2.2 Setear `autoRestart = 1` en `startStream`/`restartStream` y `autoRestart = 0` en `stopStream` (`streaming/agent/lib/liquidsoap.js`); verificación: alternar start/stop y ver el valor cambiar en la DB.
- [x] 2.3 Implementar en `streaming/agent/lib/stream-supervisor.js` el estado de reintentos en memoria con backoff creciente y tope, exigiendo dos detecciones consecutivas de proceso ausente y reusando `startStream` (el proceso ya está muerto, así no se pisa `autoRestart` con el stop previo); verificación: matar el proceso Liquidsoap y ver que el supervisor lo relanza solo.
- [x] 2.4 Abstenerse de reiniciar cuando `enabled = 0`, `autoRestart = 0` o hay un DJ conectado al harbor (chequeo telnet); verificación: los tres casos no disparan reinicio y el de DJ conectado registra la discrepancia.
- [x] 2.5 Registrar auditoría de `supervisor_auto_restart` (éxito, con PID) y `supervisor_gave_up` (al agotar intentos) en `streaming_audit_logs`; verificación: filas visibles en la tabla tras forzar un crash y tras agotar los reintentos.

## 3. Supervisión acotada al servidor propio

- [x] 3.1 Filtrar por `serverId` (o `serverId IS NULL` legacy) las consultas de `streaming/agent/lib/dj-watcher.js` y `streaming/agent/lib/dj-state.js` (`rebuildAllDjState`), usando `resolveSelfServerId()`; verificación: el agente principal deja de emitir `ECONNREFUSED` por streams asignados a otro nodo.

## 4. Deploy y verificación en producción

- [x] 4.1 Correr lint/typecheck/build del agente y del panel; verificación: comandos sin errores.
- [ ] 4.2 Desplegar y pulsar **"Actualizar nodo"** en cada nodo de streaming remoto (el cambio toca `streaming-agent` y scripts de Liquidsoap); verificación: los nodos corren la versión nueva.
- [ ] 4.3 Verificar en el nodo real que un stream caído se recupera solo (sin 404 prolongado) y que un stream detenido a mano no revive; verificación: `streaming_audit_logs` muestra el reinicio automático y el mount responde 200 tras la caída simulada.
