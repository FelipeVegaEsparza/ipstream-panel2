## Why

En `/admin/streaming` el admin solo puede ver el estado del AutoDJ de cada cliente y entrar a su configuración, pero **no puede iniciarlo ni detenerlo desde la lista**: esa acción hoy solo está disponible para el propio cliente desde su dashboard. Además, un cliente recién creado con RadioStream **no tiene ninguna playlist ni track**, por lo que al iniciar el AutoDJ suena vacío/falla hasta que el cliente sube su primera canción. Falta contenido por defecto que garantice que siempre haya algo sonando.

## What Changes

- **Botón Iniciar/Detener AutoDJ en `/admin/streaming`**: en la tabla de clientes, cada cliente con RadioStream muestra un botón contextual que inicia o detiene su AutoDJ según el estado actual (reutilizando los endpoints del streaming-agent `/start` y `/stop`, igual que hace el cliente en su dashboard).
- **Contenido por defecto al crear un cliente con RadioStream**: cada vez que se crea un cliente (registro público o creación desde el admin) y se le crea su RadioStream, el sistema agrega automáticamente:
  - Un **tema por defecto**: un MP3 corto (loop ~30s) incluido como asset del proyecto.
  - Una **playlist por defecto** activa con ese tema dentro.
  - De esta forma el AutoDJ siempre tiene algo que reproducir desde el inicio.
- **Asset de música en el repo**: se agrega un MP3 generado programáticamente (archivo pequeño, ~30s) en el repo, usado como tema inicial de cada cliente nuevo.
- **Solo clientes nuevos**: no se hace backfill a clientes existentes (fuera de alcance).
- **Actualización de nodos provisionados**: el administrador puede actualizar el código (agente/scripts/compose) de un nodo de streaming ya provisionado desde `/admin/servers`, re-descargando el repo, re-escribiendo la config y levantando el stack con `--build`. Necesario para que los nodos reciban fixes de los agentes (p.ej. el streaming-status server-aware).

## Capabilities

### New Capabilities

- `streaming/autodj`: control del AutoDJ de radio por cliente desde el admin (iniciar/detener) y contenido por defecto (playlist + tema inicial) para clientes nuevos con RadioStream.

### Modified Capabilities

- `streaming-servers`: se agrega la actualización manual del código de nodos ya provisionados (re-deploy del streaming/agente vía SSH).

## Impact

- **Admin UI**: `app/admin/streaming/page.tsx` agrega un botón Iniciar/Detener por fila, con estados de carga y feedback por toast; recarga el estado tras la acción.
- **Nuevo endpoint admin**: un endpoint solo ADMIN (p.ej. `POST /api/admin/streaming/[clientId]/autodj` con `{ action: 'start' | 'stop' }`) que llama a `streamingClient.start/stop` del agente y audita la acción.
- **Creación de cliente**:
  - `app/api/auth/register/route.ts` y `app/api/admin/users/route.ts` (flujos que crean RadioStream) disparan el seed de contenido por defecto.
  - `lib/streaming-helpers.ts` (o un helper nuevo) crea la playlist + track y sube el MP3 al agente.
- **Asset**: MP3 generado en `public/` o `assets/` (p.ej. `public/audio/default-jingle.mp3`).
- **Agente**: se reutilizan los endpoints existentes de upload y playlists del streaming-agent; no requiere cambios de schema.
- **Config/Deploy**: el MP3 viaja en la imagen de la app; el seed de contenido llama al agente para persistir track/playlist y regenerar el `.m3u`.
