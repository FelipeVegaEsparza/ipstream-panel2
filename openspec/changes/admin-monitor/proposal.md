## Why

El administrador no tiene una vista única del estado operativo: no puede ver en un solo lugar la carga del servidor (CPU/RAM/disco del VPS) ni si cada cliente tiene su streaming de audio/video online. `/admin/streaming` solo cubre radio y no muestra el estado del VPS. Se necesita un panel de monitoreo para detectar rápido si un cliente está caído y vigilar la carga del servidor.

## What Changes

- Nueva página **`/admin/monitor`** (con entrada en el sidebar admin) con dos bloques:
  1. **Servidor**: carga real del VPS — CPU (load avg 1/5/15 y %), RAM (usada/libre/total + %), disco (usado/libre + %), uptime, contenedores activos.
  2. **Clientes**: tabla unificada con el estado de streaming de **audio y video** por cliente (●AutoDJ / 🔴EN VIVO / ⏸OFF), oyentes en vivo (Icecast) y espectadores de video (IPs únicas del `.m3u8`).
- **Auto-refresh cada 10 segundos** en la página.
- Nuevo endpoint `GET /api/admin/server-stats`: lee la carga real del host. El agente (que ya usa `docker exec`) ejecuta `uptime`/`free`/`df` en el host y el panel lo consume.
- Nuevo endpoint `GET /api/admin/clients-status`: combina `radio_streams.status` + `video_streams.status` + oyentes en vivo de Icecast + espectadores de video (conteo de IPs únicas del `.m3u8` en el log de acceso de Caddy, ventana ~30s).

## Capabilities

### New Capabilities
- `admin/monitoring`: Vista de monitoreo operativo del panel — estado del servidor (carga) y estado de streaming por cliente (audio y video, con oyentes y espectadores en vivo).

### Modified Capabilities
<!-- Ninguna: no cambia el comportamiento de capabilities existentes; agrega capacidad de monitoreo nueva. -->

## Impact

- **Agente** (`streaming/agent/`): exponer un endpoint de estado del host (carga real vía `exec` de `uptime`/`free`/`df`) y, si aplica, un endpoint que cuente espectadores de video desde el log de Caddy.
- **Panel** (`app/api/admin/`): rutas `server-stats` y `clients-status` que consultan al agente y a la DB.
- **UI** (`app/admin/monitor/page.tsx` + componentes): la página nueva con auto-refresh 10s.
- **Menú admin** (`lib/menu-items.ts` o equivalente): entrada `/admin/monitor`.
- **Conteo de espectadores**: parseo del access.log de Caddy (IPs únicas del `.m3u8`) — aproximado, sin infraestructura nueva.
