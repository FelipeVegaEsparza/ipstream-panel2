## Why

Hoy el panel y todo el streaming (radio y TV) corren juntos en un único VPS: si un servidor de radio se satura o se cae, afecta a todos los clientes y no hay forma de escalar ni de aislar servicios. El panel ya es un CMS completo (clientes, contenido, bibliotecas, parrillas) y ya controla un agente de streaming por HTTP+token; solo falta separar el "plano de control" (panel central) del "plano de datos" (servidores de streaming) y poder **agregar servidores de radio y TV según se necesiten**.

## What Changes

- **Nuevo registro de servidores de streaming**: modelo `StreamingServer` (nombre, tipo `radio|tv|ambos`, URL del agente, token, hostname público, capacidades, estado/health). UI de administración para agregar/editar/eliminar servidores. **(BREAKING**: `STREAMING_AGENT_URL`/`STREAMING_AGENT_TOKEN` dejan de apuntar a un agente fijo).
- **Asignación por servicio**: `radioServerId` en `RadioStream` y `videoServerId` en `VideoStream`, asignados manualmente al crear/editar el cliente. Un cliente puede tener radio y TV en servidores distintos.
- **Enrutamiento multi-servidor**: el `streaming-client` resuelve URL+token según el servidor asignado; los uploads de biblioteca (audio y video) van al servidor asignado; las URLs públicas de streaming (Icecast, RTMP/HLS) se derivan del registro del servidor, no de env globales.
- **Unicidad de puerto por servidor**: `liquidsoapTelnetPort` deja de ser único global y pasa a ser único por servidor.
- **Alerta de servidor caído**: el panel detecta (health check) que un servidor no responde y **alerta visualmente** al admin ("R1 no responde, N clientes afectados"). Nunca actúa solo.
- **Migración manual de clientes**: acción explícita del admin para mover un cliente (radio y/o TV) a otro servidor: copia de archivos → swap de `serverId` → start en destino → stop en origen → reescritura de URLs públicas → limpieza. El panel **no** migra automáticamente (ni por carga ni por fallo).

## Capabilities

### New Capabilities

- `streaming-servers`: registro y ciclo de vida de servidores de streaming, asignación de clientes por servicio, enrutamiento de uploads y URLs públicas, alertas de servidor caído, y migración manual de clientes entre servidores.

### Modified Capabilities

- `admin/monitoring`: el monitoreo deja de ser de un solo servidor y pasa a agregar el estado de **todos** los servidores de streaming registrados, sus clientes y su salud, incluyendo alertas de servidor caído (solo informativas).

## Impact

- **Esquema Prisma**: nuevo modelo `StreamingServer`; campos `radioServerId`/`videoServerId` en `RadioStream`/`VideoStream`; quitar unicidad global de `liquidsoapTelnetPort`.
- **Panel (Next.js)**: `lib/streaming-client.ts` pasa de env fijo a resolución por `serverId`; nuevas API/UI admin de servidores; extensión de `/admin/monitor` multi-servidor; workflow de migración; reescritura de `BasicData.radioStreamingUrl`/`videoStreamingUrl`.
- **Streaming agent**: endpoints para health/export de biblioteca; permanece conectado a la MySQL central; no cambia su orquestación local (icecast/liquidsoap/srs/encoder).
- **Deploy**: cada servidor de streaming corre su propio stack reducido (agent + icecast/liquidsoap o srs/encoder) sin la app del panel; el VPS central conserva app + DB.
- **Configuración**: variables de entorno de streaming globales migran a datos por servidor en la DB.
