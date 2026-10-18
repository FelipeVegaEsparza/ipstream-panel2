# Proposal

## Why

Hoy un DJ de radio necesita instalar BUTT, MIXXX u otro encoder para salir al aire. Eso deja afuera a quien quiere transmitir rápido desde el navegador, no puede instalar software o necesita mezclar música local con su voz. La oportunidad es convertir "Transmitir en vivo" en una consola web: biblioteca local, dos decks, EQ, loops híbridos, micrófono y cue por auriculares, con la misma integración de slots, prioridades y AutoDJ que ya existe.

## What Changes

- Nueva sección **Transmitir en vivo** en Radio (`/dashboard/streaming/live`), separada de **Conexión DJ** (que sigue siendo para encoders externos).
- Biblioteca local persistente: el navegador recuerda una carpeta autorizada (File System Access API + handles en IndexedDB, Chromium). En navegadores sin soporte se degrada a archivos por sesión. Los audios nunca se suben al servidor.
- Consola de mezcla en el navegador: 2 decks, crossfader, gain, EQ de 3 bandas, loops manuales y loops cuantizados a beat cuando hay BPM, micrófono con high-pass/compresor, talkover (ducking), VU meters y cue/PFL por auriculares.
- Salida de audio única (mezcla) enviada a un **transporte pluggable**: WHIP/WebRTC contra SRS como camino principal y WebSocket/MP3 como plan B si el spike de calidad muestra pérdida audible. La consola no cambia al cambiar de transporte.
- Ingesta autenticada por sesión: el panel emite un token corto por cliente/slot; el agente valida y conecta el audio al `input.harbor` de Liquidsoap del slot elegido, respetando `plan.maxDjs`, roles y prioridades.
- Stream de radio a **192 kbps** para que la meta de calidad sea real.
- Metadata en vivo: la consola reporta tema actual y siguiente; el agente actualiza `radio_streams` y el metadata de Icecast. Historial de sesiones reutiliza `dj_sessions`.
- Reconexión y cierre ordenado: heartbeat, `sendBeacon` al cerrar, lock por slot, reanudación del AutoDJ al desconectar.
- Televisión queda fuera de este cambio; se reutilizará el lenguaje de UI y el transporte en un cambio posterior.

## Capabilities

### New Capabilities

- `radio-live-console`: sección, biblioteca local, motor de audio Web Audio, mezcladora (decks, EQ, loops, crossfader, micrófono, cue), sesión en vivo, metadata y reconexión.
- `radio-live-ingest`: autorización de sesión, transporte pluggable (WHIP/WebRTC y WebSocket/MP3), puente hacia Liquidsoap harbor, configuración de SRS/Caddy/nodos y garantía de bitrate/calidad.

### Modified Capabilities

<!-- Ninguna. La consola se integra a los requisitos existentes de multi-dj y dj-connection/session-audit sin cambiarlos. -->

## Impact

- **Panel**: nueva ruta y navegación (`lib/menu-items.ts`), componentes de consola, endpoints de sesión/autorización, feature flag por plan (`disabledMenuItems`).
- **Agente**: rutas y libs de sesión en vivo, token, puente de audio, metadata y heartbeat; reutiliza `encryption`, `dj-state`, `dj-sessions`, `plan-caps` y `liquidsoap`.
- **Streaming**: `streaming/srs/conf/srs.conf` (RTC/WHIP), `docker-compose.streaming.yml` (puerto UDP), `deploy/Caddyfile.node` y `lib/node-provisioner.ts` (ruta `/rtc/*`, candidato ICE, firewall).
- **Calidad**: `RadioStream.bitrate` a 192; ajuste del bitrate del puente y de la salida de Liquidsoap.
- **Dependencias de cliente**: evaluación de `idb` (handles), `wavesurfer.js` (waveform), parser de tags y detector de BPM; se cargan de forma diferida.
- **Nodos remotos**: al tocar agente/SRS/Caddy, cada nodo debe actualizarse con **"Actualizar nodo"** después del deploy.
- **Base de datos**: sin tablas nuevas obligatorias; `dj_sessions` y `radio_streams` cubren sesión, estado y metadata. Se evaluará un campo de origen (`webrtc`/`websocket`) para analítica.
- **PWA**: sin cambios en este cambio.
- **Riesgo principal**: la calidad de la cadena Opus→...→MP3. Se resuelve con un spike y un gate de calidad antes de comprometer el transporte definitivo.
