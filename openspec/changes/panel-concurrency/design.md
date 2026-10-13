# Design

## Context

Ver `proposal.md - Why`. Restricciones que moldean la solución:

- El deploy es sensible: `deploy/scripts/deploy.sh` y `health-check.sh` referencian el contenedor `ipstream-app` por nombre, publican el puerto `3000` en el host y corren el `prisma db push` haciendo `exec` sobre ese contenedor.
- Caddy apunta a `reverse_proxy app:3000`; el `docker-entrypoint.sh` hace las tareas de arranque una vez por contenedor (db push, migraciones, admin, plantillas).
- `instrumentation.ts` arranca el poller de salud en cada proceso Next.
- No hay Redis; el state compartido natural es MySQL.

## Goals / Non-Goals

**Goals:**
- Usar varios núcleos y subir el techo de requests/segundo sin cambiar la topología de deploy ni Caddy.
- Mantener el rate-limit global y las tareas de fondo con un solo dueño.
- Cambio reversible y sin modificar comportamiento funcional.

**Non-Goals:**
- Escalar entre máquinas (réplicas/contenedores separados) o balanceo multi-host.
- Introducir Redis u otro servicio nuevo.
- Tocar UI, negocio o el agente de streaming.

## Decisions

**1. Cluster de Node dentro del contenedor con un launcher `server.js`.**
Un proceso primario lanza N workers con `cluster.fork()`; cada worker crea un servidor HTTP que sirve con `next({ dev: false }).getRequestHandler()`. Comparten el puerto `3000`.
- Por qué no réplicas de contenedor: exigirían separar el init del arranque (evitar N `prisma db push`/seeds concurrentes), quitar el puerto publicado, convertir el health check y reescribir `deploy.sh`/`health-check.sh`. Mucho mayor radio de impacto para el mismo resultado en una sola máquina.
- Por qué no `pm2`: agrega dependencia y su modo cluster con `next start` es frágil; el launcher son ~40 líneas.
- Trade-off aceptado: con servidor custom se pierde la "Automatic Static Optimization" de `next start`; en este panel las rutas son dinámicas (App Router, λ), así que no aplica.

**2. Rate-limit con backend MySQL.**
`lib/rate-limit.ts` pasa a async y usa una tabla `rate_limits` (`identifier` PK, `count`, `resetAt`). Escritura atómica con `INSERT ... ON DUPLICATE KEY UPDATE` (reinicia si la ventana venció, si no incrementa) y luego lectura del contador. Limpieza perezosa de filas vencidas. Si la DB falla, **fail-open** (permite) y loguea, para no bloquear login por un error del almacén.
- Alternativa descartada: Redis (servicio nuevo) o seguir en memoria (no sería global entre workers).
- La tabla la crea `prisma db push` en el arranque (ya corre en el entrypoint y en `deploy.sh`).

**3. Dueño único del poller de salud.**
El primario asigna `PANEL_POLLER=1` solo al worker de índice 0 y `0` al resto; los workers reiniciados conservan su índice. `instrumentation.ts` arranca el poller solo si `PANEL_POLLER !== '0'` (así el modo de un solo proceso sigue funcionando).

**4. Cantidad de workers.**
`WEB_CONCURRENCY`; si no está o es inválido, `max(1, cpus − 1)` (deja un núcleo para MySQL/streaming), tope 16.

**5. Pool de Prisma.**
Cada worker abre su propio pool (default `cpus*2+1`). Con 3–4 workers el total (~27–36) queda muy por debajo de `max_connections` (151). No se fuerza `connection_limit`; se mantiene el default.

## Risks / Trade-offs

- **Compatibilidad del servidor custom** → verificar con `smoke.js` y `repeat realistic.js`; rollback = redeploy del tag anterior (ya probado).
- **`ON DUPLICATE KEY UPDATE` es específico de MySQL** → el proyecto ya es MySQL; si se migrara de motor habría que revisar.
- **Tareas admin en vuelo por proceso** (`node-provisioner`/`domain-provisioner` usan un `Map` de jobs activos por proceso) → son acciones de admin poco frecuentes y con guardas en DB; se acepta el riesgo (no se toca en este change).
- **Memoria por worker** → cada worker carga Next + engine de Prisma; con 7.8 GB y 1 proceso usando ~150 MB hay margen. Monitorizar `docker stats`.
- **Cachés en memoria por worker** (`menu-cache`, `streaming-servers`, `client-domains`) → cada worker cachea lo suyo; la invalidación de menú es local, así que otros workers pueden servir menú viejo hasta el TTL (30 s). Aceptable.

## Migration Plan

1. Implementar y typecheck/build local.
2. Deploy normal (push a `main`). La tabla `rate_limits` se crea en el arranque.
3. Verificar: `smoke.js` OK y `realistic.js` a 100 VUs mostrando throughput mayor que la línea base (112 req/s) y CPU repartida entre cores.
4. Rollback: redeploy del tag anterior.

## Open Questions

- Ninguna bloqueante. El escalado entre máquinas (réplicas reales) queda como change futuro si se migra a un VPS mayor o multi-nodo.
