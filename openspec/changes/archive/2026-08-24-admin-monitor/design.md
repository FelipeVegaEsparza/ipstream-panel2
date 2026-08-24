## Context

El panel no expone la carga real del host (los contenedores ven su propio /proc). El agente (`streaming/agent`) ya usa `docker exec` para controlar ffmpeg/liquidsoap y corre en el host, así que es el lugar natural para leer `uptime`/`free`/`df`. El HLS de video se sirve vía Caddy (`/live/*`, `/dj/*` → SRS:8080) y Caddy registra cada request con IP en `/data/access.log`; contar IPs únicas del `.m3u8` en la ventana reciente da el número aproximado de espectadores. Los oyentes de radio ya se leen en vivo de Icecast (`getMountStatus`). `/admin/streaming` ya lista radio; la vista nueva agrega video + servidor.

## Goals / Non-Goals

**Goals:**
- Página `/admin/monitor` con estado del servidor + tabla unificada de clientes (radio y video).
- Auto-refresh cada 10s.
- Endpoints `server-stats` y `clients-status` (solo ADMIN).
- Conteo de espectadores de video por IPs únicas del `.m3u8` (aproximado).

**Non-Goals:**
- Histórico/gráficas de carga o audiencia (fuera de alcance; `/admin/stats` cubre stats históricas de radio).
- Precisión exacta de espectadores (conteo aproximado estándar de CDN).
- Alertas/notificaciones de caída (solo vista).
- Contar espectadores por sesión autenticada (solo IPs).

## Decisions

### 1. Carga del host vía agente (`docker exec`)
El agente expone `GET /api/admin/host-stats` (o similar) que ejecuta en el host: `uptime` (load), `free -m`, `df -h /` y `docker ps` (conteo de activos). El panel lo consume en `server-stats`.
- **Alternativa**: montar `/proc` del host en el contenedor app → descartada (invasivo); el agente ya tiene docker.sock y el patrón `exec`.

### 2. Espectadores de video desde el log de Caddy
El agente (o el panel) lee `/data/access.log` de Caddy vía `docker exec ipstream-caddy`. Filtra requests `GET */<streamKey>.m3u8`, agrupa por streamKey y cuenta IPs únicas en los últimos ~30s.
- **Alternativa**: instrumentar el player del panel para reportar heartbeats → descartada, solo cubre players del panel, no espectadores públicos.
- **Nota**: el log de Caddy es por dominio público (`panelipstream.cl`). Se parsea el JSON de una línea con `remote_ip` y `uri`.

### 3. Endpoint unificado `clients-status`
Consulta: `clients` + `radioStream.status` + `videoStream.status` + oyentes en vivo (agente, `getMountStatus`) + espectadores (log Caddy). Devuelve una fila por cliente con `radioStatus`, `videoStatus`, `listeners`, `viewers`.
- Se reutiliza la lógica de `getMountStatus` del agente para oyentes en vivo (no la columna `listenerCount` de DB, que es snapshot).

### 4. Frontend `/admin/monitor`
Página client component con `setInterval(load, 10000)` + botón de refresh manual. Dos secciones: cards de servidor (CPU/RAM/disco/uptime) y tabla de clientes con badges de estado (●AutoDJ verde, 🔴EN VIVO rojo pulsante, ⏸OFF gris). Entrada en `AdminSidebar.tsx`.

## Risks / Trade-offs

- **Espectadores por IP aproximado** → [Riesgo] Mitigación: es el estándar de CDN; se documenta como aproximado. NAT/CGNAT pueden subestimar.
- **Parseo del log de Caddy** → [Riesgo] Mitigación: formato JSON estable (`remote_ip` + `uri`); si cambia, el conteo falla degradado a 0 sin romper el panel.
- **Carga del host vía docker exec** → [Riesgo] Mitigación: el agente ya hace `docker exec`; si falla, se muestra "no disponible".
- **Refresco cada 10s con parseo de log** → [Riesgo] Mitigación: el log es pequeño (roll_size 10mb, roll_keep 5); leer las últimas líneas es barato.
- **`/admin/monitor` duplica info de `/admin/streaming`** → [Riesgo] Mitigación: monitor es de solo lectura/resumen; `/admin/streaming` sigue siendo gestión/config.

## Migration Plan

1. Deploy agente con `host-stats` + endpoint de espectadores; deploy panel con rutas y página.
2. Rollback: quitar la entrada del sidebar y las rutas; el agente puede dejar el endpoint sin uso.

## Open Questions

- Ninguna: la ubicación (página nueva), el conteo (IPs únicas del m3u8) y el refresh (10s) fueron decididos con el usuario en exploración.
