## 1. Modelo de datos y migración

- [x] 1.1 Crear modelo `StreamingServer` en `prisma/schema.prisma` (name, type, baseUrl, tokenEnc, publicHostname, isActive, lastHealthAt, isHealthy, timestamps)
- [x] 1.2 Agregar `serverId` (FK opcional a `StreamingServer`, onDelete SetNull) a `RadioStream` y `VideoStream`
- [x] 1.3 Quitar `@unique` global de `RadioStream.liquidsoapTelnetPort` y agregar único compuesto `@@unique([serverId, liquidsoapTelnetPort])`
- [x] 1.4 Generar migración Prisma y aplicarla (dev + prod)
- [x] 1.5 Script/seed de "Servidor Principal" desde los env actuales (`STREAMING_AGENT_URL`, `STREAMING_AGENT_TOKEN`, `ICE_PUBLIC_URL`, etc.) y asignación de los `RadioStream`/`VideoStream` existentes

## 2. streaming-client multi-target

- [x] 2.1 Refactorizar `lib/streaming-client.ts`: resolver que recibe un `StreamingServer` (baseUrl + token) y devuelve un cliente listo; `videoClient` igual
- [x] 2.2 Función de ayuda para descifrar `tokenEnc` y resolver el servidor de un cliente (radio y video) por su `serverId`
- [x] 2.3 Migrar consumidores (rutas `app/api/dashboard/streaming/*`, `app/api/dashboard/television/*`) al resolver multi-target
- [x] 2.4 Verificar compatibilidad: con un solo servidor registrado el comportamiento es idéntico al actual

## 3. API y UI admin de servidores + health checks + alertas

- [x] 3.1 Endpoints CRUD de servidores (`GET/POST/PATCH/DELETE /api/admin/servers`) con Zod, solo ADMIN, token encriptado al guardar
- [x] 3.2 Endpoint de health check de todos los servidores que actualiza `isHealthy`/`lastHealthAt` en DB y devuelve estado + clientes afectados por servidor
- [x] 3.3 Poller periódico (vía `instrumentation.ts` o ruta de cron con `CRON_SECRET`) que ejecuta el health check de servidores
- [x] 3.4 UI admin `/admin/servers`: listar, crear, editar, dar de baja (con bloqueo si tiene clientes asignados) y estado de salud
- [x] 3.5 Alerta visual de servidor caído en el header de admin y en `/admin/monitor` (solo informativa, sin acciones automáticas)
- [x] 3.6 Bloquear dar de baja un servidor con clientes asignados mostrando la cantidad afectada

## 4. Enrutamiento de uploads y URLs públicas

- [x] 4.1 Al crear/editar un cliente, selección manual de servidor de radio y/o video en el admin, persistiendo `serverId`
- [x] 4.2 Enrutar uploads de biblioteca (audio y video) al agente del servidor asignado del servicio correspondiente
- [x] 4.3 Derivar URLs públicas de streaming del `publicHostname` del servidor asignado (radio: mount Icecast; TV: RTMP/HLS) en lugar de env globales
- [x] 4.4 Reescribir `BasicData.radioStreamingUrl`/`videoStreamingUrl` al asignar servidor
- [x] 4.5 Ajustar unicidad de puertos telnet en el agente para que asigne dentro del rango de su servidor

## 5. Migración manual de clientes

- [x] 5.1 Endpoint del agente para listar/exportar la biblioteca de un cliente (archivos crudos + metadata)
- [x] 5.2 Función en el panel de copia vía panel: obtener crudo del origen y subir al destino (tracks, jingles, covers, videos/thumbnails) preservando rutas
- [x] 5.3 Verificación en destino (conteo de archivos por cliente) antes del swap
- [x] 5.4 Swap atómico de `serverId` en transacción, arrancar stream en destino y detener en origen
- [x] 5.5 Rollback consistente: revertir `serverId` y limpiar destino si falla tras el swap; dejar origen intacto si falla antes
- [x] 5.6 Limpieza best-effort de archivos del origen tras éxito y registro en `StreamingAuditLog`
- [x] 5.7 UI de migración por cliente: elegir servicio(s) a migrar y servidor destino, validar destino sano, mostrar progreso y bloqueo si el origen no responde
- [x] 5.8 Ocultar/inhabilitar migración para clientes sin streams configurados

## 6. Monitoreo multi-servidor

- [x] 6.1 `/admin/monitor`: agregar estado de salud de todos los servidores registrados y sus clientes asignados
- [x] 6.2 Indicar "estado no disponible" para streams de clientes cuyo servidor no responde, sin romper el resto del panel
- [x] 6.3 Agregar botón/acción de migración manual por cliente desde el monitor

## 7. Deploy y documentación

- [x] 7.1 Crear `docker-compose.streaming.yml` (stack reducido: agent + icecast + liquidsoap [+ srs + video-encoder]) para nodos de streaming sin la app del panel
- [x] 7.2 Documentar en `DEPLOY.md` el despliegue de nodos de streaming, conexión a la MySQL central, firewall por IP y (opcional) WireGuard
- [ ] 7.3 Verificar flujo end-to-end: panel en VPS central + al menos un nodo de radio y uno de TV; subir contenido, migrar un cliente entre servidores y confirmar alerta de servidor caído
