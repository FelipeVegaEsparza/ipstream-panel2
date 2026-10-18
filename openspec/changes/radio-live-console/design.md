# Design

## Context

Ver `proposal.md` para la motivación. El punto de partida relevante:

- Radio usa Icecast + Liquidsoap. Los DJs externos publican por `input.harbor`; el agente genera el script con un harbor por slot, prioridades por rol y fallback a AutoDJ (`streaming/agent/lib/script-generator.js`).
- El panel es Next.js 14 / React 18. El agente es Fastify sobre Node 20 y controla contenedores con `docker exec`; el contenedor `video-encoder` ya es el patrón para procesos FFmpeg.
- SRS 5 ya corre para TV con hooks `on_publish`/`on_unpublish`, pero no tiene RTC habilitado.
- La sesión y el historial de DJ ya existen en `dj_sessions`; el estado en vivo vive en `dj-state.js`.
- Los nodos remotos se aprovisionan con `lib/node-provisioner.ts`, `deploy/Caddyfile.node` y `docker-compose.streaming.yml`.

## Goals / Non-Goals

**Goals:**
- Una consola web de radio con biblioteca local, dos decks, EQ, loops, micrófono y cue.
- Un contrato de sesión único que permita cambiar el transporte de audio sin rehacer la consola.
- Mantener a Liquidsoap como autoridad de slots, prioridades y fallback.
- Calidad verificable: 192 kbps, estéreo, con un gate A/B antes de fijar el transporte.

**Non-Goals:**
- TV/WebRTC de video (cambio posterior).
- Beatmatching/sync completo, keylock o análisis musical avanzado.
- Subir o almacenar música del cliente en el servidor.
- Funcionamiento confiable en móvil con pantalla bloqueada.
- Reemplazar BUTT/Mixxx para shows musicales críticos.

## Decisions

### 1. La consola produce un `MediaStream`; el transporte es pluggable

El motor de audio termina en un `MediaStreamAudioDestinationNode`. Ese stream se entrega a una interfaz `LiveTransport` con dos implementaciones: `WhipTransport` (WebRTC/SRS) y `WebSocketTransport` (audio comprimido). La UI y la mezcladora no conocen el transporte.

Alternativas:
- Acoplar la consola a WHIP: más simple al inicio, pero si el gate de calidad falla hay que reescribir la salida.
- Usar solo WebSocket: buena calidad, pero pierde la latencia y el control de congestión de WebRTC para el monitoreo y para TV futuro.

### 2. Biblioteca local con handles, sin copiar archivos

En Chromium se usa `showDirectoryPicker()`; el `FileSystemDirectoryHandle` se guarda en IndexedDB. El índice (nombre, duración, tamaño, tags) también. En Firefox/Safari se usa selección de archivos por sesión. Nunca se suben audios al servidor.

Alternativas:
- Copiar audios a OPFS/IndexedDB para persistir en todos los navegadores: duplica archivos, consume cuota y agrava el problema de derechos.
- Subir a la biblioteca del panel: cambia el modelo de storage y licencias; queda fuera de alcance.

El escaneo corre en un Worker. `navigator.storage.persist()` reduce la evicción. Si un handle deja de resolver, se marca el track y se ofrece re-vincular.

### 3. Motor de audio con buffers para decks activos

Se decodifica a `AudioBuffer` el track activo y el siguiente; el resto permanece como archivos. Esto habilita loops precisos (`loopStart`/`loopEnd`), crossfades con reloj de `AudioContext` y waveform. Para archivos largos (sets) se usa modo `<audio>` + `MediaElementAudioSourceNode` con loops aproximados y un aviso.

Cadena:

```
Deck A → Gain → EQ(3 bandas) ─┐
                               ├→ Crossfader → MusicBus → Duck ─┐
Deck B → Gain → EQ(3 bandas) ─┘                                  ├→ Master → Limiter → MediaStream
Mic → HPF → Compresor → Gain ───────────────────────────────────┘
CueBus (pre-fader / PFL) → AudioContext.destination → auriculares
```

Decisiones asociadas:
- El bus de programa **no** se conecta a `AudioContext.destination`; solo al `MediaStreamAudioDestinationNode`. Evita feedback.
- Loops híbridos: in/out manual siempre disponible; si el detector de BPM (Worker, carga diferida) tiene confianza, se ofrece cuantización a beat y halve/double. Sin BPM, no se inventa un grid.
- Talkover por análisis RMS del micrófono con rampas de ganancia; botón manual como respaldo.
- Memoria: máximo dos buffers activos; se purgan al cambiar de deck. Si el track excede el límite configurado, se usa modo streaming.

Alternativas:
- Solo `<audio>`: menor memoria, pero loops imprecisos y sin waveform fiable.
- Decodificar toda la biblioteca: inviable en RAM.

### 4. Transporte primario WHIP, fallback WebSocket

**WHIP (primario):** el navegador negocia con el agente, que valida el token y proxea la señalización a SRS. SRS publica el media como RTMP (`rtc_to_rtmp`) en un app dedicado; el agente detecta el publish y arranca el puente al harbor.

**WebSocket (fallback):** el navegador usa `MediaRecorder` (Opus/WebM en Chromium; AAC/MP4 en Safari) y envía chunks autenticados al agente. El agente los pasa a FFmpeg y publica al harbor. No requiere UDP.

El gate de calidad decide cuál queda como primario para radio. La consola no cambia.

Alternativas:
- Puente WebRTC propio (Pion/MediaMTX): evita el paso AAC de SRS, pero suma un servicio y un lenguaje más al stack.
- MP3 en el navegador con `lamejs`: una generación menos, pero CPU en el cliente y más complejidad.
- SRT desde el navegador: no es nativo.

### 5. Puente al harbor mediante un contenedor `audio-bridge`

El agente no trae FFmpeg. Se agrega un contenedor liviano `audio-bridge` (Alpine + FFmpeg), análogo a `video-encoder`, presente también en nodos solo-radio. El agente lo controla con `docker exec`:

- WHIP: `ffmpeg -i rtmp://srs/... -c:a copy|libmp3lame ... -f mp3 icecast://source:<slotPwd>@liquidsoap:<harborPort>/<mount>`.
- WebSocket: `docker exec -i audio-bridge ffmpeg -i pipe:0 ... icecast://...`.

Si `input.harbor` acepta AAC, se prueba `-c:a copy` para evitar una generación con pérdida. Si no, se usa MP3 192k. El harbor conserva sus callbacks `on_connect`/`on_disconnect`, por lo que prioridades y fallback no cambian.

Alternativas:
- Instalar FFmpeg en el agente: engorda la imagen y mezcla responsabilidades.
- Reutilizar `video-encoder`: en nodos solo-radio puede estar deshabilitado.

### 6. Autorización de sesión de corta vida

El panel emite un token firmado (HMAC/JWT) con `clientId`, `slotId`, `mount`, `transport`, `jti` y expiración de 60–120 s. Panel y agente comparten `LIVE_SESSION_SECRET`. El agente valida firma, expiración, cliente/slot y uso único; mantiene un lock por slot. Los reconexiones piden un token nuevo al panel.

El token viaja por HTTPS/WSS; no se loguea. Se aplican rate limits por cliente y por IP. Un intento inválido no afecta sesiones existentes.

Alternativas:
- Reutilizar la password del slot: expone credenciales al navegador y no permite revocación.
- Un token de larga duración: más cómodo, pero riesgoso si se filtra.

### 7. Nodos: RTC en puerto dedicado y candidato público

SRS se configura con `rtc_server` en UDP 8010 (8000 choca con Icecast), `candidate` igual a la IP pública del nodo, y `rtc_to_rtmp` habilitado. Caddy expone `/rtc/*` al agente (que valida y proxea a SRS) y `/ws/live` al agente. El provisioner escribe el candidato y el puerto, y el compose publica el UDP. El firewall del nodo debe abrir ese puerto.

Si un nodo no tiene IP pública o el UDP está bloqueado, la sesión cae al transporte WebSocket.

### 8. Fallback automático al AutoDJ por silencio

Cada `input.harbor` se envuelve con `blank.detect` (`max_blank`/`threshold` configurables). Cuando la fuente queda en silencio, Liquidsoap llama al agente por `/api/streams/:clientId/harbor/silence`. El agente:

- Si hay una sesión de consola para ese mount, la termina con motivo `silence`; el puente se detiene, el harbor se desconecta y vuelve el AutoDJ.
- Si es un DJ externo, ejecuta `stopHarborInput` por telnet; el harbor se desconecta y vuelve el AutoDJ.

Un cooldown por slot evita cortes repetidos si el encoder reconecta. El panel recibe el motivo en el heartbeat y deja de reconectar automáticamente; muestra "AutoDJ retomó el control por silencio" y permite volver a salir al aire. Los valores por defecto son 10 s, -50 dB y 30 s de cooldown, configurables por env.

Alternativas:
- Detección solo en el cliente: no cubre a un DJ externo que deja el encoder conectado en silencio.
- Kick directo sin callback: menos control y sin auditoría. Se prefiere el callback al agente para decidir entre consola y DJ externo.

### 9. Metadata e historial

La consola reporta current/next en cada cambio. El agente actualiza `radio_streams` y llama a `updateMetadata` de Icecast para que el oyente vea el título. La sesión se registra en `dj_sessions` con una columna `origin` (`harbor`, `webrtc`, `websocket`). El estado en vivo reutiliza `dj-state` para que el dashboard y el WS existentes lo muestren.

### 10. UI y feature flag

Nueva ruta `app/dashboard/streaming/live/page.tsx`, ítem `streaming-live` en `lib/menu-items.ts` y en `disabledMenuItems` del plan. La vista principal prioriza el flujo de un reproductor tipo RadioBOSS/ZaraRadio: navegador de archivos a la izquierda, lista de reproducción a la derecha, transporte con anterior/play-pausa/siguiente y seek, y tema actual/próximo. El mezclador de 2 decks/EQ/loops **no se muestra** en esta iteración; los componentes y el motor quedan en el código para retomarlo más adelante. Debajo del reproductor se muestra la botonera de efectos. La consola incluye un botón de pantalla completa que aplica la Fullscreen API sobre el contenedor de la consola, excluyendo el sidebar/header del dashboard y ajustando la altura de los paneles. El motor vive en `lib/live-console/` como clase TS sin React; la UI lo controla con un hook. Waveform, parser de tags y detector de BPM se cargan con `import()` diferido.

### 11. Botonera de efectos de sonido

Los efectos se guardan como `Blob` en IndexedDB (`ipstream-live-effects`) y el tamaño de la botonera en `localStorage`. No se suben al servidor. El motor decodifica el efecto y lo conecta a `masterGain`, de modo que se mezcla sobre música/micrófono y sale al stream y al monitor. Cada slot tiene volumen propio y se puede reemplazar o quitar. Los efectos siguen disponibles después de cerrar el navegador; si se limpia el almacenamiento del sitio, se pierden.

Alternativas:
- Subirlos al servidor: permitiría usarlos en otros dispositivos, pero suma storage, cuotas y latencia; queda fuera de esta iteración.
- Reproducirlos solo en el cue: no cumpliría el objetivo de que salgan al aire. Se conectan al programa.

## Risks / Trade-offs

- **Calidad de la cadena Opus → … → MP3** → gate A/B con referencia directa a 192k; si falla, el fallback WebSocket pasa a ser el transporte de radio. Medir estéreo, bitrate y latencia.
- **`input.harbor` no acepta AAC** → el puente cae a MP3 192k; se documenta la generación extra y se evalúa un puente propio si el gate no pasa.
- **Memoria de `AudioBuffer`** → solo activo + siguiente; límite de duración para modo buffer; fallback a `<audio>`.
- **Soporte de navegador** → Chromium desktop es el objetivo pleno; Firefox/Safari tienen biblioteca por sesión y pueden carecer de loops precisos. La UI muestra el modo degradado.
- **Pestaña en segundo plano / suspensión** → `wakeLock`, aviso visible, heartbeat y reconexión con backoff; si no se recupera, se cierra la sesión y vuelve el AutoDJ.
- **UDP/NAT del nodo** → candidato público correcto, puerto dedicado, y fallback WebSocket. TURN queda como evaluación futura.
- **Tokens filtrados** → TTL corto, uso único, rate limit, HTTPS/WSS obligatorio y logs sin token.
- **Feedback de audio** → el programa nunca va a parlantes; confirmación obligatoria de auriculares antes de salir al aire.
- **Conflictos de slot** → lock por slot y conciliación con `dj-state`; una sesión de consola no debe duplicar un harbor.
- **Actualización de nodos** → cambios en agente/SRS/Caddy obligan a pulsar **"Actualizar nodo"** en cada nodo remoto; se documenta en el rollout.
- **Derechos de autor** → los archivos no se suben; la responsabilidad de la música emitida queda en el cliente.

## Migration Plan

1. **Spike (sin UI):** habilitar RTC en un nodo de staging; probar WHIP, estéreo, harbor AAC/MP3, 192k y 30 min de estabilidad. Ejecutar el gate A/B y registrar el resultado.
2. **Consola sin streaming:** biblioteca, motor de audio, decks, EQ, loops, micrófono y cue. Se puede validar localmente.
3. **Sesión y transporte:** endpoints de sesión, token, WHIP, WebSocket, puente, heartbeat, metadata e historial.
4. **Rollout:** feature flag apagado por defecto; habilitar por plan en staging y luego en producción. Actualizar nodos remotos antes de habilitar.
5. **Rollback:** apagar el flag; la sección desaparece y **Conexión DJ** sigue funcionando. No hay migración destructiva. La columna `origin` es nullable y compatible.

## Open Questions

- Ninguna que cambie el alcance o el enfoque. El detector de BPM y la librería de waveform se eligen durante la implementación; si no hay BPM confiable, los loops quedan manuales y la consola sigue siendo válida.
