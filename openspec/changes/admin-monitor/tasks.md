## 1. Agente — Estado del host

- [x] 1.1 Agregar endpoint en el agente `GET /api/admin/host-stats`: ejecuta `uptime`, `free -m`, `df -h /` y `docker ps` (activos) en el host vía exec; retorna CPU load, RAM, disco y contenedores.
- [x] 1.2 Agregar endpoint en el agente para contar espectadores de video: leer el access.log de Caddy (`docker exec ipstream-caddy`), filtrar requests `GET */<streamKey>.m3u8`, contar IPs únicas por streamKey en ventana ~30s.
- [x] 1.3 Agregar endpoint del agente con los oyentes en vivo de radio (reutilizar `getMountStatus`) o exponer la info para que el panel la combine.

## 2. Panel — Endpoints de admin

- [x] 2.1 Crear `GET /api/admin/server-stats`: consume `host-stats` del agente y devuelve CPU/RAM/disco/uptime/contenedores (solo ADMIN).
- [x] 2.2 Crear `GET /api/admin/clients-status`: combina clientes + `radioStream.status` + `videoStream.status` + oyentes en vivo + espectadores (solo ADMIN), una fila por cliente.

## 3. Panel — Página /admin/monitor

- [x] 3.1 Crear `app/admin/monitor/page.tsx`: sección de servidor (cards CPU/RAM/disco/uptime/contenedores) + tabla de clientes (radio/video/oyentes/espectadores) con badges de estado.
- [x] 3.2 Auto-refresh cada 10s (`setInterval`) + botón de refresh manual; indicador de actualización en curso.
- [x] 3.3 Agregar entrada "Monitor" al `AdminSidebar.tsx`.

## 4. Verificación

- [x] 4.1 `npx tsc --noEmit` sin errores nuevos.
- [ ] 4.2 En producción: abrir `/admin/monitor` y verificar que muestra la carga real del VPS y el estado de los clientes.
- [ ] 4.3 Verificar que el conteo de espectadores de video refleja las IPs del `.m3u8` y que los oyentes de radio salen en vivo.
