# Tasks

## 1. Spike de calidad y transporte

- [ ] 1.1 Habilitar RTC en un nodo de staging (UDP dedicado + candidato público) y verificar que un WHIP de prueba publica y se reproduce; registrar comandos y resultado.
- [ ] 1.2 Medir la cadena WHIP→SRS→puente→harbor y verificar que el audio conserva estéreo y el bitrate objetivo; registrar evidencia.
- [ ] 1.3 Probar si `input.harbor` acepta AAC (`-c:a copy`) y comparar con MP3 192k; documentar cuál usar.
- [ ] 1.4 Ejecutar el gate A/B a 192k contra una fuente MP3 directa y registrar el transporte elegido; si falla WHIP, validar el fallback WebSocket.
- [ ] 1.5 Probar 30 minutos continuos con pestaña en background y cambio de red; documentar reconexión y estado del AutoDJ.
- [x] 1.6 Documentar prerrequisitos del nodo: puerto UDP, firewall, candidato, y la obligación de pulsar "Actualizar nodo".

## 2. Base de la sección

- [x] 2.1 Agregar `streaming-live` a `MenuItemKey`, `MENU_ITEMS` y la navegación de Radio; verificar que aparece y navega.
- [x] 2.2 Integrar el nuevo ítem en `disabledMenuItems` del plan; verificar en `PlanForm` y en el menú del cliente que el flag lo oculta.
- [x] 2.3 Crear la ruta `app/dashboard/streaming/live/page.tsx` con un shell usando tokens de diseño; verificar `npm run build`.
- [x] 2.4 Crear la estructura de `lib/live-console/` con tipos y contratos del motor/transporte; verificar typecheck.

## 3. Biblioteca local

- [x] 3.1 Implementar alta por selector de archivos y drag & drop; verificar agregar, listar y quitar archivos.
- [ ] 3.2 Implementar persistencia de carpeta con File System Access + handle en IndexedDB; verificar restauración tras recargar en Chromium.
- [x] 3.3 Implementar el degradado sin persistencia en navegadores no soportados; verificar que la consola sigue operando por sesión.
- [x] 3.4 Indexar la carpeta en un Worker (nombre, duración, tamaño, tags) con progreso; verificar que la UI no se bloquea con una carpeta grande.
- [x] 3.5 Detectar archivos movidos/eliminados y ofrecer re-vincular o quitar; verificar que no se interrumpe la sesión activa.
- [x] 3.6 Mostrar formatos no soportados y errores de índice sin bloquear el resto de la biblioteca; verificar con un archivo inválido.
- [x] 3.7 Agregar tests unitarios de índice/handles y documentar el comportamiento por navegador; verificar que los tests pasan.

## 4. Motor de audio y mezcladora

- [x] 4.1 Construir el grafo base (master, limitador, `MediaStreamAudioDestinationNode`) y verificar que expone un track de audio válido.
- [x] 4.2 Implementar dos decks con play/pause/seek y cola con auto-advance; verificar reproducción y cambio de track.
- [x] 4.3 Implementar gain, crossfader equal-power y EQ de 3 bandas; verificar con tests unitarios de curvas y respuesta.
- [x] 4.4 Implementar loops manuales in/out; verificar repetición continua y salida del loop.
- [x] 4.5 Implementar detección de BPM en Worker y loops cuantizados con halve/double; verificar que sin BPM confiable solo queda el loop manual.
- [x] 4.6 Implementar micrófono con permisos, high-pass, compresor y gain; verificar denegación de permiso y modo solo música.
- [x] 4.7 Implementar talkover por RMS con rampas y botón manual; verificar atenuación y restauración.
- [x] 4.8 Implementar cue/PFL por auriculares y confirmación obligatoria; verificar que el programa no sale por parlantes.
- [x] 4.9 Implementar VU meters de master y micrófono con `AnalyserNode`; verificar lectura estable.
- [ ] 4.10 Aplicar límite de memoria y fallback a `<audio>` para tracks largos; verificar un archivo largo sin agotar RAM.
- [x] 4.11 Agregar tests unitarios del motor (crossfade, loop, RMS, cuantización) y documentar límites de memoria; verificar que pasan.

## 5. Sesión, autorización e ingesta

- [x] 5.1 Implementar en el panel el endpoint de creación de sesión con token corto, slot y transporte; verificar expiración y alcance por cliente.
- [x] 5.2 Implementar en el agente la validación de token, uso único y lock por slot; verificar rechazos de token expirado, reusado y de otro cliente.
- [x] 5.3 Implementar el proxy WHIP autenticado hacia SRS; verificar publish aceptado y rechazo sin token.
- [ ] 5.4 Configurar RTC en SRS, UDP en compose, ruta `/rtc/*` en Caddy y candidato/puerto en el provisioner; verificar un nodo nuevo.
- [ ] 5.5 Agregar el contenedor `audio-bridge` y el puente FFmpeg al harbor (AAC copy o MP3 192k según el spike); verificar takeover y reanudación del AutoDJ.
- [ ] 5.6 Implementar el fallback WebSocket autenticado y su publicación al harbor; verificar una sesión completa sin UDP.
- [ ] 5.7 Implementar start/stop/heartbeat, `sendBeacon`, timeout y reconciliación de puentes huérfanos; verificar cierre abrupto y reinicio del agente.
- [x] 5.8 Actualizar `dj_sessions` con `origin` y la metadata de `radio_streams`/Icecast; verificar historial y now-playing.
- [ ] 5.9 Implementar reconexión con backoff y estado visible; verificar caída y recuperación del transporte.
- [x] 5.10 Agregar tests de agente (token, lock, puente, heartbeat) y documentar endpoints; verificar `cd streaming/agent && npm test`.

## 6. UI de la consola

- [x] 6.1 Implementar la máquina de estados de sesión (`idle`, `preparing`, `connecting`, `live`, `reconnecting`, `ended`, `error`) y su hook; verificar transiciones.
- [x] 6.2 Implementar el selector de slot con `plan.maxDjs`, ocupación y rol; verificar límites y slot ocupado.
- [x] 6.3 Implementar el flujo "Salir al aire" con preflight, permisos, auriculares y countdown; verificar bloqueo sin confirmación.
- [x] 6.4 Implementar la vista en vivo (estado, transporte, bitrate, red); verificar datos durante una sesión.
- [x] 6.5 Implementar "Terminar" y el cierre ordenado; verificar que el AutoDJ vuelve y la UI queda en `ended`.
- [x] 6.6 Mostrar now-playing local y sincronizarlo con el panel; verificar cambio de tema.
- [x] 6.7 Mostrar errores de compatibilidad, formato, micrófono y red con acciones claras; verificar cada caso.
- [ ] 6.8 Revisar la UI con tokens de marca, tema claro/oscuro y responsive; verificar visualmente en ambos temas.
- [x] 6.9 Agregar tests de componentes/hook para estados y controles; verificar que pasan.

## 7. Integración y rollout

- [ ] 7.1 Fijar el bitrate de radio en 192k y verificar el reporte del stream y del puente.
- [ ] 7.2 Agregar una prueba E2E con media falsa que inicie y termine una sesión; verificar que corre en CI/local.
- [ ] 7.3 Ejecutar la matriz manual Chromium/Firefox/Safari (biblioteca, micrófono, cue, reconexión) y registrar resultados.
- [x] 7.4 Documentar el rollout de nodos y la obligación de "Actualizar nodo"; actualizar AGENTS/README y verificar que el procedimiento es reproducible.
- [ ] 7.5 Habilitar el flag en staging y verificar una sesión real de 30 minutos con metadata e historial.
- [ ] 7.6 Verificar la convivencia con Conexión DJ: un DJ externo y la consola respetan prioridades y no duplican fuentes.
- [ ] 7.7 Verificar rollback apagando el flag: la sección desaparece y el streaming existente sigue operativo.


## 8. Fallback automático al AutoDJ por silencio

- [x] 8.1 Envolver cada `input.harbor` con `blank.detect` y callback al agente; verificar que el script generado compila con `liquidsoap --check`.
- [x] 8.2 Agregar el endpoint de silencio con cooldown, cierre de la consola o kick del DJ externo, y auditoría; verificar los tests del agente.
- [x] 8.3 Informar el motivo `silence` en el heartbeat y evitar la reconexión automática en el panel; verificar typecheck/build.
- [x] 8.4 Documentar las variables `RADIO_SILENCE_*` y el comportamiento en README/AGENTS.
- [x] 8.5 Ejecutar la suite del agente y del panel; verificar que pasan.
