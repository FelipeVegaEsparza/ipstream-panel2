## Context

El streaming de radio tiene una separación claro entre el panel (Next.js) y el streaming-agent (Fastify + MySQL propio, que comparte la DB con el panel vía `@@map`). El agente expone endpoints para iniciar/detener el AutoDJ (`POST /api/streams/:clientId/start|stop`), subir tracks, crear/activar playlists y agregar tracks. El panel ya los consume vía `lib/streaming-client.ts` (`streamingClient.start/stop/uploadTrack/createPlaylist/...`), y el cliente usa esos mismos endpoints desde su dashboard (`/api/dashboard/streaming/control`).

Hoy en `/admin/streaming` el admin no tiene botón de start/stop, y al crear un cliente nuevo con RadioStream no se siembra ningún contenido (playlist/track), por lo que el AutoDJ puede arrancar sin música.

Motivación y alcance: ver `proposal.md`. Requisitos de comportamiento: ver `specs/streaming/autodj/spec.md`.

## Goals / Non-Goals

**Goals:**
- Botón Iniciar/Detener AutoDJ por cliente en `/admin/streaming`, solo ADMIN, con feedback de estado y auditoría.
- Siembra automática de contenido por defecto (tema MP3 + playlist activa) al crear un cliente con RadioStream.
- MP3 por defecto como asset del repo.

**Non-Goals:**
- No backfill a clientes existentes (solo clientes nuevos).
- No se modifica el schema de la DB ni del agente.
- No se cambia el comportamiento del cliente en su dashboard.

## Decisions

### 1. Endpoint admin de control del AutoDJ: `POST /api/admin/streaming/[clientId]/autodj`
Un endpoint solo ADMIN que recibe `{ action: 'start' | 'stop' }`, verifica que el cliente tenga RadioStream habilitado, llama a `streamingClient.start/stop(clientId)` y registra la acción en `StreamingAuditLog`. Devuelve el nuevo estado.

- **Alternativa considerada:** reutilizar `/api/dashboard/streaming/control` con sesión ADMIN. Se descarta: ese endpoint usa `requireStreamingClient` (auth del cliente), no del admin, y no audita para el panel.
- **Alternativa considerada:** llamar directo desde la UI al agente. Se descarta: la UI nunca toca el agente; todo pasa por el panel (mantiene la arquitectura y el registro en Prisma).

### 2. Botón Iniciar/Detener en la tabla de `/admin/streaming`
En `app/admin/streaming/page.tsx`, para cada fila con `hasRadioStream` se agrega un botón contextual:
- Si `status === 'autodj'` o `status === 'live'` → "Detener".
- Si está apagado/off → "Iniciar".
Se mantiene el estado de carga por cliente, se refresca la lista tras la acción y se muestra toast con el resultado. Reutiliza el mismo estilo de los botones existentes ("Configurar →", "+ Crear stream").

### 3. Siembra de contenido por defecto al crear cliente
Nuevo helper `seedDefaultAutoDjContent(clientId)` en `lib/streaming-helpers.ts` (o un helper dedicado `lib/streaming-seed.ts`) que:
1. Lee el MP3 del asset del repo (`public/audio/default-jingle.mp3`).
2. Lo sube al agente vía `streamingClient.uploadTrack(clientId, file)` (crea `Track`).
3. Crea una playlist `createPlaylist(clientId, { name: 'Playlist por defecto' })`.
4. Agrega el track a la playlist (`addTrackToPlaylist`).
5. Activa la playlist (`activatePlaylist`), que regenera el `.m3u`.

El helper se invoca en los dos flujos que crean RadioStream, siempre en `try/catch` aislado (un fallo no rompe la creación del cliente):
- `app/api/auth/register/route.ts` (tras `createRadioStreamForClient`).
- `app/api/admin/users/route.ts` (tras `createRadioStreamForClient`).

Se protege contra duplicados: antes de sembrar se verifica que el cliente no tenga ya tracks ni playlist activa; si ya tiene contenido, se omite.

- **Alternativa considerada:** insertar track/playlist directo en la DB compartida desde el panel. Se descarta: rompería la coherencia con el agente (que además escribe el archivo físico en su filesystem y regenera el `.m3u`); es más robusto pasar por los endpoints del agente que ya validan y persisten.
- **Alternativa considerada:** seed dentro del agente al crear el RadioStream. Se descarta: el agente no conoce el asset de la app y el flujo de creación vive en el panel.

### 4. Asset MP3 por defecto
Se genera un MP3 corto (~30s) y se guarda en `public/audio/default-jingle.mp3`. Se genera una sola vez con un script/ffmpeg y queda versionado en el repo. En el panel se sube al agente (que lo valida como audio/mpeg) al sembrar el contenido. No requiere clave/licencia: es un loop musical simple generado por el proyecto.

## Risks / Trade-offs

- **MP3 por defecto con nombre/ID3** → El agente lee metadata (título/artista); si el MP3 no trae ID3, el título cae en el nombre de archivo. Mitigación: generar el MP3 con ID3 básico (título "Jingle de bienvenida", artista "IPStream").
- **Fallo de red al sembrar contenido** → El seed corre en `try/catch` aislado; el cliente se crea igual y puede subir su propia música luego. El spec lo cubre ("Fallo al crear el contenido por defecto").
- **Duplicar contenido por defecto** → Guarda por "no tracks y no playlist activa" antes de sembrar; mitigación adicional: marcar la playlist/track con nombre estable ("Playlist por defecto").
- **Iniciar cuando ya está corriendo** → El agente rechaza con `Stream already está corriendo`; el endpoint lo propaga como error al admin con mensaje claro.
