# Phase 8 — Multi-DJ ilimitado por Plan + asignación dinámica de mounts

**Change OpenSpec:** `scale-and-stabilize-multi-dj`
**Fecha:** 2026-08-16
**Alcance:** estabilizar y escalar el núcleo multi-DJ existente. Sin breaking changes.

---

## Resumen

Este change elimina el tope rígido de 4 DJs por radio, lo reemplaza por `Plan.maxDjs` (entero, default 4, configurable), genera mounts dinámicamente hasta ese cap (`/dj1`…`/djN`, reutilizando enteros cuando se borran slots intermedios), permite N DJs simultáneos y actualiza el Panel para que no use listas hardcodeadas.

**Explícitamente fuera de alcance** (queda para cambios futuros): `LiveSession`/historial, recovery de sesiones tras reinicio, endpoint `kick`, endpoint `rotate-password` con restart, dashboard dedicado para DJs, `DjSchedule`, identidad de DJ (`User.role='DJ'`), `ClientMembership`, `maxDjs = null` (sin tope), cross-fade DJ ↔ AutoDJ.

---

## Cambios aplicados

### Schema (Prisma)

- `prisma/schema.prisma:329` — modelo `Plan`: nueva columna `maxDjs Int @default(4)` (NOT NULL).
- `prisma/migrations/20260816_plan_max_djs/migration.sql` — `ALTER TABLE plans ADD COLUMN maxDjs INT NOT NULL DEFAULT 4`. La cláusula `DEFAULT 4` rellena in-place todas las filas existentes.

### Agente (Fastify sidecar)

- **`streaming/agent/lib/plan-caps.js` (nuevo)** — `getPlanMaxDjs(clientId)` resuelve `Plan.maxDjs` vía `JOIN clients → plans`. Si el valor es `NULL` o el plan no existe, devuelve `DEFAULT_MAX_DJS = 4`.
- **`streaming/agent/lib/mount-allocation.js` (nuevo)** — `nextAvailableMount(clientId, planMaxDjs)`, `listAvailableMounts(clientId, planMaxDjs)`, `isMountInUse(clientId, mount, excludeDjId?)`. Asignan mounts como `/djK` con K = entero más bajo libre entre 1 y `planMaxDjs`.
- **`streaming/agent/lib/script-generator.js`** — añade `HARD_DJS_LIMIT = 50` y validación al inicio del bloque de DJs: si `activeDjs.length > 50`, lanza error antes de generar el `.liq`. Defensa contra `Plan.maxDjs` absurdo.
- **`streaming/agent/routes/streams.js`**:
  - `POST /api/streams/:clientId/djs` (línea ~619) — el `mount` ya no viene del body; se asigna vía `nextAvailableMount(...)`. El cap se consulta con `getPlanMaxDjs(...)`. Si excede, devuelve `400 { error: 'max_djs_reached', planMaxDjs: <n> }`.
  - `PATCH /api/streams/:clientId/djs/:djId` (línea ~666) — la validación de `mount` usa `parseDjMountIndex` + `getPlanMaxDjs` (rechazo `400 no_available_mount` si está fuera del cap) y `isMountInUse(..., excludeDjId=djId)` (rechazo `409 mount_in_use` si otro slot lo tiene).
  - `GET /api/streams/:clientId/harbor/status` (línea ~346) — el response ahora incluye `planMaxDjs: number` y `availableMounts: string[]` (campos aditivos; los previos intactos).
- **Sin tocar**: `GET /status`, `POST /dj-takeover`, `DELETE /djs/:djId`, `POST /harbor/connected`, `POST /harbor/disconnected`. El ciclo AutoDJ ↔ DJ sigue funcionando con N DJs por el `isAnyDjActive(mount)` ya presente en `harbor/disconnected:317`.

### Panel (Next.js)

- **`app/api/dashboard/streaming/connection/route.ts`** (GET) — pasa `planMaxDjs` y `availableMounts` al cliente. Defensivo: si el agente aún no los expone, cae a `4` y `[]`.
- **`app/dashboard/streaming/connection/page.tsx`**:
  - Elimina `MOUNTS = ['/dj1', '/dj2', '/dj3', '/dj4']`.
  - Añade estado `planMaxDjs` y `apiAvailableMounts` poblados desde la API.
  - Banner de estado: `connectedSlots.length > 1` → muestra `"DJ en vivo (Ana + Luis + …)"` ordenado por `ROLE_HIERARCHY (owner > host > guest)` y `priority` ascendente.
  - Subtítulo de la sección: `Plan máximo: {planMaxDjs} DJs.`
  - Botón "+ Nuevo DJ": `disabled={djSlots.length >= planMaxDjs}` con `title="Plan máximo: N DJs"`.
  - Modal de creación: el `<select>` de mount ahora muestra los `availableMounts` del agente (más el mount del slot en edición). Mensaje contextual: "El próximo mount libre se asigna automáticamente al guardar."
  - `sortedSlots` (antes `sortDjs`) — mismo criterio de orden, reutilizado por banner, lista y referencias futuras.

---

## Compatibilidad hacia atrás

- **APIs existentes**: ningún cambio breaking.
  - `POST /api/streams/:clientId/djs` aceptaba `{ name, mount, priority, role, password }`. Ahora ignora `mount` (lo asigna el servidor). Backwards compatible: clientes que aún envían `mount` no se rompen.
  - `PATCH /api/streams/:clientId/djs/:djId` rechaza `mount` fuera del cap o en uso (antes aceptaba cualquier `/dj1`–`/dj4`). La UI ya solo ofrece mounts válidos, así que no hay impacto para el Panel.
  - `GET /api/streams/:clientId/harbor/status` añade dos campos. Consumidores que solo lean `harborPort`, `activeDjs`, `djSlots` siguen funcionando.
  - `GET /api/streams/:clientId/status` sin cambios.
  - `POST /api/streams/:clientId/dj-takeover`, callbacks de harbor, `DELETE`, etc. sin cambios.
- **Slots existentes con `/dj1`–`/dj4`**: no se renumeran. La nueva asignación ve esos mounts como ocupados y entrega `/dj5`, `/dj6`, … según haga falta.
- **Planes existentes**: la migración rellena `maxDjs = 4` en todas las filas. Comportamiento idéntico al anterior para clientes actuales.

---

## Decisiones

- **`Plan.maxDjs` como columna entera, no nullable** — alineado con la directriz del usuario. `null` (ilimitado) queda para un cambio futuro si hace falta.
- **Asignación secuencial sin huecos** — `nextAvailableMount` devuelve el entero más bajo libre. Si se borra `/dj2`, el próximo DJ recibe `/dj2`.
- **Cap de defensa 50 en script-generator** — independiente del plan. Si `Plan.maxDjs > 50`, el `POST` lo permite pero el `.liq` se niega a compilar con `> 50` inputs `input.harbor()`. Doble protección.
- **Banner multi-DJ con orden por rol/prioridad** — coherente con la lógica de fallback de Liquidsoap (`script-generator.js:101-103`). Mismo criterio que la lista de slots.
- **`POST /djs` ya no acepta `mount`** — la API se vuelve más estricta (mount = decisión del servidor). Backwards compatible porque el campo se ignora, no se rechaza.

---

## Riesgos

- **Dropdown con hasta 49 opciones** — aceptable para v1. Caso realista: 8–16 DJs. v2 puede reemplazarlo por un input numérico o asignación auto server-side.
- **Reducir `maxDjs` deja slots huérfanos** — no se borran automáticamente. El admin debe borrarlos manualmente. Documentado en `design.md` (R2).
- **El POST rechaza si excede cap, pero el watcher (`dj-watcher.js`) sigue dependiendo de `_djActive`** — sin cambios. La lógica multi-DJ del callback de disconnect ya consulta `isAnyDjActive(mount)`, por lo que sigue funcionando con N slots activos.

---

## Plan de despliegue

1. **Panel primero**: `prisma migrate deploy` aplica la migración `20260816_plan_max_djs` (ADD COLUMN con DEFAULT 4, instantáneo en tablas pequeñas).
2. **Agente después**: reiniciar `ipstream-streaming-agent`. Recoge los nuevos `lib/plan-caps.js`, `lib/mount-allocation.js`, el cap en `script-generator.js` y los cambios en `routes/streams.js`. Las regeneraciones de `.liq` para clientes existentes siguen usando sus DJs actuales.
3. **Panel último**: reiniciar el contenedor `app`. El nuevo `connection/page.tsx` consume los nuevos campos. Si por algún motivo se reinicia antes que el agente, los campos caen al default 4 + lista vacía (defensa en `connection/route.ts:36-37`).

## Plan de rollback

1. `cd /home/fvegadev/Desarrollo/ipstream-sonicpanel && npx prisma migrate resolve --rolled-back 20260816_plan_max_djs`
2. Revertir commits del agente y del Panel (`git revert` del commit de este change).
3. Reiniciar agente y Panel.
4. Los slots existentes (`/dj1`–`/dj4` etc.) no se ven afectados: la columna `maxDjs` se elimina pero `radio_djs` sigue intacta. Si el admin había creado DJs con mount `/dj5` o más, esos slots quedan pero el código antiguo los rechaza (por el cap de 4). Acción manual: borrarlos o aceptar la inconsistencia.

---

## Pruebas manuales pendientes

Las pruebas requieren un entorno con Docker (`docker compose up -d`). Se listan como checkboxes a ejecutar por el operador antes de mergear.

### Setup

```bash
docker compose up -d --build
docker compose logs -f app agent
# Esperar a que el agente termine su startup (ver "agent listening on :4000" en logs).
```

- [ ] **5.1** Cliente con `Plan.maxDjs = 8`: crear 8 DJs con mounts `/dj1`…`/dj8`. El noveno debe rechazarse con `400 max_djs_reached`.
  ```bash
  curl -X POST http://localhost:4000/api/streams/<clientId>/djs \
    -H "Authorization: Bearer $STREAMING_AGENT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"DJ 1","password":"x","priority":1,"role":"owner"}'
  # Repetir hasta 8. El 9 debe devolver error.
  ```

- [ ] **5.2** Borrar el slot `/dj3` y crear uno nuevo → el nuevo recibe mount `/dj3`.
  ```bash
  curl -X DELETE http://localhost:4000/api/streams/<clientId>/djs/<djId-de-dj3>
  curl -X POST .../djs -d '{"name":"Reused","password":"x",...}'
  # El response debe traer mount: "/dj3"
  ```

- [ ] **5.3** `PATCH /djs/:djId` con `mount = "/dj2"` cuando otro slot ya lo tiene → `409 mount_in_use`.
  ```bash
  curl -X PATCH http://localhost:4000/api/streams/<clientId>/djs/<djId-de-dj4> \
    -d '{"mount":"/dj2"}'
  # Esperar 409 con error: "mount_in_use"
  ```

- [ ] **5.4** Conectar dos DJs a slots distintos en la misma radio. Ambos deben aparecer en `activeDjs` y el banner del Panel debe listar ambos nombres ordenados por rol/prioridad.
  ```bash
  # Conectar con dos BUTT distintos o simulando con:
  # DJ Ana en /dj1, DJ Luis en /dj3
  curl http://localhost:4000/api/streams/<clientId>/harbor/status
  # Verificar activeDjMounts === ["/dj1","/dj3"] o similar.
  # En el Panel: /dashboard/streaming/connection → "DJ en vivo (Ana + Luis)"
  ```

- [ ] **5.5** Desconectar uno de los dos DJs → el otro sigue al aire, `status` permanece `live`, el banner del Panel muestra solo el que queda.
  ```bash
  # Cerrar uno de los BUTT. Verificar:
  curl http://localhost:4000/api/streams/<clientId>/status
  # dj.connected sigue true (conectado el otro)
  curl http://localhost:4000/api/streams/<clientId>/harbor/status
  # activeDjMounts solo tiene el que queda.
  ```

- [ ] **5.6** Desconectar el último DJ → `status` pasa a `autodj`, AutoDJ reanuda, banner vuelve a "AutoDJ activo".
  ```bash
  # Cerrar el segundo BUTT.
  curl http://localhost:4000/api/streams/<clientId>/status
  # db.status === "autodj"
  # Verificar que la playlist suena de nuevo en http://localhost:8000/<mount>
  ```

- [ ] **5.7** Cliente con plan legacy (`maxDjs IS NULL` en DB antes de migración — improbable tras el deploy, pero defensivo): crear 4 DJs funciona; intentar el quinto se rechaza con `max_djs_reached` y `planMaxDjs: 4`.
  ```bash
  # Si se quiere simular, ejecutar antes del deploy:
  # mysql> UPDATE plans SET maxDjs = NULL WHERE name = 'basic';
  # (no se permite porque la columna es NOT NULL, pero el helper getPlanMaxDjs
  # devuelve 4 igualmente como defensa.)
  ```

---

## Validación OpenSpec

```bash
LD_LIBRARY_PATH=/run/host/usr/lib64 PATH="/run/host/usr/bin:$PATH" \
  openspec validate scale-and-stabilize-multi-dj --strict
```

Salida esperada: `valid` (sin errores, sin warnings).

---

## Archivos modificados / creados

```
prisma/schema.prisma                                       (M)
prisma/migrations/20260816_plan_max_djs/migration.sql      (A)
streaming/agent/lib/plan-caps.js                           (A)
streaming/agent/lib/mount-allocation.js                    (A)
streaming/agent/lib/script-generator.js                    (M)
streaming/agent/routes/streams.js                          (M)
app/api/dashboard/streaming/connection/route.ts            (M)
app/dashboard/streaming/connection/page.tsx                (M)
streaming/PHASE-8-RESULTS.md                              (A)
```

(M = modificado, A = añadido)

Ningún archivo fuera de las `affected_areas` declaradas en `.openspec.yaml` fue tocado.