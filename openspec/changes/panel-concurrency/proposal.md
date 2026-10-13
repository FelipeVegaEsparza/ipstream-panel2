# Proposal

## Why

Tras la fase 1 (`optimize-panel-runtime`), el techo del panel sigue siendo el **event loop único** de Node: se estanca en ~1.2 cores de los 4 vCPU del VPS, con MySQL y RAM ociosos, y el throughput no escala al subir concurrencia. Para aprovechar varios núcleos sin cambiar la topología de deploy (Caddy, contenedores, scripts), el panel debe atender con **varios procesos worker** dentro del contenedor y compartir el estado que hoy vive en memoria.

## What Changes

- **Concurrencia multi-proceso**: el panel arranca un *primary* que lanza N workers Node (cluster) compartiendo el puerto; N configurable por `WEB_CONCURRENCY` (default: CPUs − 1).
- **Rate-limit compartido**: el límite deja de ser un contador en memoria por proceso y pasa a una tabla en MySQL, para que sea global entre workers (login, registro, mensajes, votos, push).
- **Poller único**: el poller de salud de servidores de streaming se ejecuta en un solo worker (hoy `instrumentation` lo arrancaría en cada proceso).
- **Shutdown ordenado**: el primary reenvía SIGTERM a los workers y reinicia un worker que muera.

**No-goals**: réplicas en contenedores separados (escalado entre máquinas), Redis, y cambios de UI/negocio.

## Capabilities

### New Capabilities

- `platform/panel-concurrency`: ejecución multi-proceso del panel, límite de peticiones compartido y tareas de fondo con dueño único.

### Modified Capabilities

- Ninguna.

## Impact

- **Código**: nuevo `server.js` (launcher de cluster) y `CMD` del `Dockerfile`; `instrumentation.ts` (poller condicionado); `lib/rate-limit.ts` (backend MySQL) y sus llamadas (login, registro, chat, contacto, votos, push); `prisma/schema.prisma` (modelo `RateLimit`).
- **Config/Deploy**: `WEB_CONCURRENCY` en `deploy/docker-compose.prod.yml` y `.env.example`. No cambian Caddy ni `deploy.sh` ni los `container_name`.
- **Sin cambios**: schema existente (solo tabla nueva), UI/tokens, streaming/agente/nodos.
- **Compatibilidad**: los hashes y datos existentes siguen igual; el rate-limit ahora requiere la tabla nueva (la crea `prisma db push` en el arranque).
