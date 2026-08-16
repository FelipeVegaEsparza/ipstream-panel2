## Why

El sistema multi-DJ ya tiene la mayor parte de la infraestructura: tabla `radio_djs`, generador de scripts con un `input.harbor()` por slot (`streaming/agent/lib/script-generator.js:84-99`), fallback chain, callbacks `on_connect`/`on_disconnect` que avisan al agente (`script-generator.js:94`), y un `Map` en memoria (`_djActive` en `routes/streams.js`) que rastrea qué slots están activos.

Sin embargo, la implementación actual tiene una limitación concreta que bloquea el uso en producción:

**Tope rígido de 4 DJs por radio**, duplicado en cuatro sitios: `streaming/agent/routes/streams.js:619, 638, 682` y `app/dashboard/streaming/connection/page.tsx:26`. Cualquier radio con más de 4 DJs necesita editar el código del agente y reiniciarlo.

Este cambio cierra ese único hueco. Elimina el `>= 4` hardcodeado y lo reemplaza por un cap configurable en `Plan.maxDjs`. Como efecto colateral positivo, se mejora la UI del Panel (que ya itera slots conectados pero seguía dependiendo de la lista literal de 4 mounts en el dropdown) y se verifica que el ciclo AutoDJ ↔ DJ en vivo se mantiene correcto con N DJs simultáneos.

## What Changes

- **Nuevo límite configurable por Plan**: `Plan.maxDjs Int @default(4)` reemplaza el `>= 4` hardcodeado. La columna es **entera, no nullable** — `null` (ilimitado) **no se soporta en este cambio**. Planes existentes reciben `maxDjs = 4` por backfill de la migración, preservando el comportamiento actual.
- **Asignación dinámica de mounts**: `/dj1`, `/dj2`, …, `/djN` con N = `maxDjs` del plan. Sin lista hardcodeada. Si el slot `/dj2` se borra, el siguiente DJ creado recibe `/dj2` (reutilización secuencial sin huecos).
- **Validación en script-generator**: tope de defensa de 50 DJs en la generación del `.liq` para evitar abuso si un admin configura un `maxDjs` absurdo.
- **Endpoint `harbor/status` enriquecido**: `GET /api/streams/:clientId/harbor/status` ahora devuelve `planMaxDjs` (int) y `availableMounts` (lista de mounts libres hasta el cap). Campos existentes sin cambios.
- **UI del Panel sin listas hardcodeadas**: la página `/dashboard/streaming/connection` elimina la constante `MOUNTS = ['/dj1', '/dj2', '/dj3', '/dj4']` y consume `availableMounts` y `planMaxDjs` del endpoint.
- **Banner de estado multi-DJ**: cuando hay más de un DJ conectado simultáneamente, la cabecera "DJ en vivo" lista los nombres ordenados por rol (`owner > host > guest`) y luego por `priority` ascendente, en lugar de mostrar solo el primero.

## What Does NOT Change (deferred to future changes)

Explícitamente fuera de alcance y reservado para cambios posteriores:

- Tabla `live_sessions` e historial de sesiones de DJ.
- Persistencia de sesiones a través de reinicios del agente (recovery desde Icecast `/status-json.xsl`).
- Endpoint `POST /djs/:djId/kick` para expulsar DJs.
- Endpoint o semántica `rotate-password` con restart explícito (la rotación sigue tratándose dentro del PATCH existente sin restart — comportamiento actual).
- Dashboard dedicado para DJs (`/dj/login`, `/dj/[slug]/dashboard`).
- `DjSchedule` (scheduler de turnos de DJs).
- Identidad propia del DJ (`User.role = 'DJ'`, `ClientMembership`, `RadioDj.userId`).
- Cualquier sistema de membresía de DJs.
- Puerto harbor dedicado por slot (se mantiene compartido por cliente, como hoy).
- Cross-fade entre DJ ↔ AutoDJ (`fallback(track_sensitive=false)` sin cambios).
- Métricas por sesión DJ (peak listeners, bytes transferidos).

## Capabilities

### New Capabilities
- `multi-dj`: Capacidad para operar N DJs por radio, donde N viene del plan, con mounts dinámicos, conexiones simultáneas y ciclo AutoDJ estable.

### Modified Capabilities
- (Ninguna existente con cambios de requirement. Este cambio introduce una capability nueva que cubre el delta. No hay specs previas que declaren comportamiento sobre `Plan.maxDjs` o sobre el cap de DJs.)

## Impact

**Servicios afectados:**
- `streaming/agent`: `routes/streams.js` (POST/PATCH `/djs` reemplazan el `>= 4` por cap por plan; `GET /harbor/status` añade campos); nuevo `lib/mount-allocation.js`.
- `streaming/agent/lib/script-generator.js`: cap de defensa en la generación (50 slots máximo).
- `prisma/schema.prisma`: modelo `Plan` (+columna `maxDjs Int @default(4)`).
- `app/dashboard/streaming/connection/page.tsx`: elimina `MOUNTS` hardcodeado, consume `availableMounts` y `planMaxDjs`, banner multi-DJ.
- `app/api/dashboard/streaming/connection/route.ts`: pasa los nuevos campos del agente.

**APIs nuevas:**
- Ninguna. Solo se **agregan campos** a respuestas existentes (`harbor/status` ahora incluye `planMaxDjs` y `availableMounts`). Backwards compatible.

**APIs modificadas (cambios aditivos, sin breaking):**
- `POST /api/streams/:clientId/djs` — antes rechazaba con `400 { error: "Máximo 4 DJs por radio" }` cuando había 4; ahora consulta `Plan.maxDjs` del cliente. Si el plan lo permite y el slot está libre, asigna `/djK` con K = entero más bajo libre. Si excede el cap del plan, devuelve `400 { error: "max_djs_reached", planMaxDjs: <n> }`.
- `PATCH /api/streams/:clientId/djs/:djId` — la validación de `mount` ahora también consulta `nextAvailableMount` para rechazar 409 si el mount ya está usado por otro slot del mismo cliente.
- `GET /api/streams/:clientId/harbor/status` — añade `planMaxDjs` (int) y `availableMounts` (string[]). Campos previos (`harborPort`, `activeDjs`, `slots`) intactos.

**APIs sin cambios:**
- `GET /api/streams/:clientId/status` — shape intacta (`dj.connected`, `dj.name`, `dj.connectedAt`).
- `POST /api/streams/:clientId/dj-takeover` — sin cambios.
- `DELETE /api/streams/:clientId/djs/:djId` — sin cambios.
- Rutas de control (`start`, `stop`, `restart`, `regenerate-m3u`) — sin cambios.

**Schema:**
- `Plan`: añadir `maxDjs Int @default(4)` (NOT NULL). Migración con backfill (`UPDATE plans SET maxDjs = 4 WHERE maxDjs IS NULL` antes del `NOT NULL`, o usar `ADD COLUMN ... DEFAULT 4 NOT NULL` que MySQL rellena).

**Breaking changes:**
- Ninguno. Todos los cambios son aditivos o son mensajes de error con la misma estructura JSON. El único consumidor de estos endpoints es el Panel, que se actualiza en el mismo cambio.

**Riesgos:**
- Si un admin configura `maxDjs = 50` (el tope de defensa) o más, el `.liq` generado podría ser largo. Mitigado por el cap interno del script-generator.
- El dropdown dinámico en el Panel debe manejar listas de hasta 49 elementos sin problema de UX (los selects HTML lo soportan, pero un dropdown de 50 opciones es incómodo). Aceptable para v1; v2 puede reemplazarlo por un input numérico o asignación automática.
- Migración de planes existentes: si algún plan tiene DJ slots ya creados con mounts `/dj1`…`/dj4`, la nueva asignación mantiene esos mounts intactos (no se renumeran).