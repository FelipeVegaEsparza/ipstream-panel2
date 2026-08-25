## Context

Hoy el panel (Next.js + MySQL central) y el stack de streaming (agent + icecast + liquidsoap + srs + video-encoder) viven juntos en un solo VPS (ver `docker-compose.yml`). El panel controla el streaming a través de un único agente fijo, configurado por env (`STREAMING_AGENT_URL`/`STREAMING_AGENT_TOKEN`, ver `lib/streaming-client.ts`). El agente escribe y lee la misma MySQL central (`streaming/agent/lib/db.js`) y almacena los archivos de biblioteca en volúmenes locales (`/var/lib/radio/<clientId>/`, `/var/lib/video/`). Las URLs públicas se derivan de env globales (`ICE_PUBLIC_URL`, `RTMP_RELAY_PUBLIC_HOST`, `HARBOR_PUBLIC_HOSTNAME`) y se materializan por cliente en `BasicData.radioStreamingUrl`/`videoStreamingUrl`. `RadioStream.liquidsoapTelnetPort` es único a nivel global de la DB. La motivación del cambio está en `proposal.md`; los requisitos de comportamiento en `specs/`.

## Goals / Non-Goals

**Goals:**
- Registro de servidores de streaming (radio/tv/ambos) gestionado desde el panel, con token propio por servidor.
- Asignación manual y por servicio (radio vs TV) de cada cliente a un servidor.
- Enrutamiento de subidas de biblioteca y de URLs públicas hacia el servidor asignado.
- Health check de servidores con alerta visual informativa (sin acciones automáticas).
- Migración manual de clientes entre servidores, orquestada por el panel, con estado consistente ante fallos.

**Non-Goals:**
- Failover o rebalanceo automático de clientes.
- Alias estable por cliente (gateway nginx por subdominio) — fase futura, ver Risks.
- Almacenamiento compartido/objeto (NFS/S3/MinIO).
- Transferencia directa agente↔agente en v1 (se hace vía panel; ver Decisions).
- Convertir al panel en única escritora de la DB (el agente conserva su acceso directo a MySQL).

## Decisions

### D1. Modelo `StreamingServer` y asignación por servicio
Nueva tabla `StreamingServer`: `id`, `name`, `type` (`radio|tv|both`), `baseUrl` (URL del agente), `tokenEnc` (token encriptado AES-256-GCM, misma clave que `lib/encryption.ts`), `publicHostname`, `isActive`, `lastHealthAt`, `isHealthy`, timestamps. Se agregan `RadioStream.serverId` y `VideoStream.serverId` (FK opcional, `SetNull`), permitiendo que radio y TV de un cliente vivan en servidores distintos.

- *Por qué:* independencia de servicios y de servidores; es lo que habilita migrar radio sin tocar TV.
- *Alternativa:* un solo `serverId` por cliente — descartada: menos flexible y obligaría a migrar ambos servicios juntos.

### D2. `streaming-client` multi-target
Se refactoriza `lib/streaming-client.ts`: en lugar de constantes por env, un resolver que recibe un `StreamingServer` (baseUrl + token) y devuelve un cliente listo. Las rutas del panel resuelven el servidor desde `radioStream.serverId`/`videoStream.serverId` antes de llamar al agente.

- *Por qué:* es el cambio más mecánico y localizado; los endpoints del agente no cambian.
- *Migración de datos:* al aplicar el cambio se siembra un `StreamingServer` "Servidor Principal" con los valores de los env actuales y se asignan a él todos los `RadioStream`/`VideoStream` existentes. Las env globales quedan como defaults para el seeding, no como fuente de verdad en runtime.

### D3. Unicidad de puerto telnet por servidor
Se quita el índice único global de `RadioStream.liquidsoalTelnetPort` y se reemplaza por único compuesto `(serverId, liquidsoapTelnetPort)`. El agente de cada servidor asigna puertos dentro de su propio rango (ya es así hoy, pero la unicidad global lo bloqueaba).

- *Por qué:* dos servidores independientes pueden usar el mismo puerto en clientes distintos; la unicidad global es un artefacto de "un solo VPS".

### D4. Health check y alerta informativa
El panel mantiene un poller periódico (intervalo en segundo plano vía `instrumentation.ts` o ruta de cron protegida por `CRON_SECRET`) que llama `/health` de cada servidor registrado y persiste `isHealthy`/`lastHealthAt` en la fila del servidor. La vista de monitoreo y el header de admin consultan ese estado persistido. Cuando `isHealthy = false`, se muestra una alerta con la cantidad de clientes afectados (query por `serverId` en `RadioStream`/`VideoStream`). **Nunca** dispara migraciones.

- *Por qué:* la alerta debe ser visible aunque el admin no esté mirando el monitor, y persistida para no depender de una pestaña abierta.
- *Alternativa:* solo polling client-side — descartada: la alerta dependería de tener el monitor abierto.

### D5. Migración manual orquestada por el panel (v1: copia vía panel)
Flujo, iniciado SIEMPRE por el admin desde el panel:

1. Validar que el servidor destino esté `isHealthy` y que el origen sea alcanzable.
2. Copiar biblioteca origen→destino **vía el panel**: el panel obtiene el archivo crudo del agente origen (endpoint raw existente) y lo sube al agente destino (endpoint multipart existente). Se copian tracks, jingles, covers (audio) y videos/thumbnails (video). Las rutas bajo el cliente se preservan.
3. Verificar en destino (conteo de archivos por cliente).
4. Swap atómico en DB: actualizar `RadioStream.serverId` (o `VideoStream.serverId`) dentro de una transacción.
5. Arrancar el stream en destino (`/start`) y detener en origen (`/stop`).
6. Reescribir `BasicData.radioStreamingUrl`/`videoStreamingUrl` con el `publicHostname` del destino.
7. Registrar en `StreamingAuditLog`.
8. Limpiar archivos del origen (best-effort) tras éxito.

**Rollback/consistencia:** si falla antes del paso 4, el origen queda intacto (nada cambió). Si falla después del swap (p. ej. no arranca en destino), se revierte el `serverId`, se limpia lo copiado en destino (best-effort) y el cliente queda en el origen.

- *Por qué vía panel:* reutiliza la autenticación y los endpoints existentes; no exige relación de confianza agente↔agente. El costo es doble ancho de banda (origen→panel→destino), aceptable para bibliotecas de tamaño medio.
- *Alternativa (fase futura):* transferencia directa agente↔agente con URLs firmadas para evitar el cuello de botella del panel.

### D6. El agente conserva acceso directo a la MySQL central
Cada servidor de streaming corre su stack reducido (agent + icecast + liquidsoap [+ srs + video-encoder]) conectándose por red a la MySQL central. No se cambia la arquitectura del agente ni su orquestación local; solo se garantiza que las filas que escribe son por cliente y ya escalan por `serverId`.

- *Por qué:* reutiliza todo lo construido (crons, dj-watcher, stats, schedules) sin reescribir el agente.
- *Deploy:* la conexión a la DB desde múltiples VPS sugiere acotar la regla de firewall de MySQL por IP y, opcionalmente, VPN (WireGuard). Se documenta en `DEPLOY.md`.

### D7. URLs públicas por servidor
El `publicHostname` (y puertos por defecto del tipo) del `StreamingServer` reemplazan a las env globales al generar la URL pública del cliente (`http://<host>:<puerto>/<mount>`). `BasicData` se actualiza al asignar el cliente y al migrar.

## Risks / Trade-offs

- **Origen caído impide migrar** → si el servidor origen no responde no se pueden copiar sus archivos; la migración se bloquea con mensaje claro (no se pierde nada, pero tampoco se migra). Mitigación futura: espejo/backup de bibliotecas en el panel o almacenamiento objeto; en v1 se requiere origen alcanzable. Se comunica al admin en la UI.
- **Migración lenta para bibliotecas grandes** (copia vía panel, doble ancho de banda) → Mitigación: indicador de progreso por archivo; fase futura con transferencia directa agente↔agente.
- **Tokens por servidor en la DB** → se almacenan encriptados (AES-256-GCM) como los passwords existentes; nunca en claro.
- **Cambio de URL del player al migrar** (oyentes/DJs del cliente ven otro host) → Es el comportamiento esperado y manual; se comunica en la UI de migración. El alias estable por cliente (gateway nginx) se deja como fase futura (Non-Goals).
- **Varios agentes escribiendo la misma MySQL** → ya ocurre hoy con un agente; con varios se escala verticalmente igual. Riesgo de contención bajo por la volumetría prevista. Mitigación: índices por `serverId` y consultas ya acotadas por cliente.
- **Unicidad compuesta de puerto** → la migración de datos debe eliminar el índice único global sin colisiones (los valores actuales ya son únicos); se crea el índice compuesto.

## Migration Plan

1. Prisma: agregar `StreamingServer`, `serverId` en `RadioStream`/`VideoStream`, quitar `@unique` de `liquidsoapTelnetPort` y crear único compuesto `(serverId, port)`.
2. Seed: crear "Servidor Principal" con valores de los env actuales y asignar los streams existentes.
3. Refactor incremental de `lib/streaming-client.ts` (resolver multi-target) manteniendo compatibilidad mientras se migra cada consumidor.
4. API/UI admin de servidores + health checks + alertas.
5. Upload routing hacia el servidor asignado.
6. Workflow de migración + UI.
7. Ajuste de deploy: `docker-compose.streaming.yml` (stack reducido por nodo) y documentación en `DEPLOY.md` (firewall MySQL, opcional WireGuard).

**Rollback:** el seed de "Servidor Principal" y la migración de datos son reversibles con un `prisma migrate rollback` y re-aplicar el `@unique` global si fuera necesario; las fases de feature (UI/API) son aditivas y no rompen el flujo de un solo VPS si se conserva un servidor registrado apuntando a él.

## Open Questions

Ninguna pendiente que cambie specs, enfoque o tareas. El alias estable por cliente, la transferencia directa entre agentes y el espejo de bibliotecas se consideran fases futuras y se pueden decidir cuando se aborden.
