## 1. Schema (Prisma)

- [x] 1.1 Añadir `maxDjs Int @default(4)` (NOT NULL) al modelo `Plan` en `prisma/schema.prisma`
- [x] 1.2 Generar la migración `20260816_plan_max_djs` con `prisma migrate dev --name plan_max_djs`; verificar que el SQL resultante incluye `ADD COLUMN maxDjs INT NOT NULL DEFAULT 4`

## 2. Agente — helpers de plan y asignación de mounts

- [x] 2.1 Crear `streaming/agent/lib/plan-caps.js` con `getPlanMaxDjs(clientId): Promise<number>` (lee `Plan.maxDjs` por JOIN `clients → plans`; si es NULL o el plan no existe, devuelve 4)
- [x] 2.2 Crear `streaming/agent/lib/mount-allocation.js` con `nextAvailableMount(clientId, planMaxDjs): Promise<string>` (devuelve `/djK` con K = entero más bajo entre 1 y `planMaxDjs` que no esté en uso en `radio_djs` para ese cliente)
- [x] 2.3 Añadir cap de defensa `HARD_DJS_LIMIT = 50` en `streaming/agent/lib/script-generator.js`: si el array de DJs recibido excede 50, lanza error con mensaje claro

## 3. Agente — refactor del CRUD de DJs para usar el cap del plan

- [x] 3.1 En `streaming/agent/routes/streams.js`, en `POST /api/streams/:clientId/djs` (línea ~611):
  - Reemplazar la lista literal `validMounts = ['/dj1', '/dj2', '/dj3', '/dj4']` por `await nextAvailableMount(clientId, await getPlanMaxDjs(clientId))`
  - Reemplazar el chequeo `countRows[0]?.cnt >= 4` (línea 638) por comparación contra `await getPlanMaxDjs(clientId)`; cambiar el mensaje de error a `max_djs_reached` con `planMaxDjs` en el body
- [x] 3.2 En `streaming/agent/routes/streams.js`, en `PATCH /api/streams/:clientId/djs/:djId` (línea ~666):
  - Mantener la validación de `mount` pero también chequear que el nuevo `mount` no esté usado por otro slot del mismo cliente (409 `mount_in_use`)
  - Si el cliente intenta cambiar el `mount` y no hay huecos disponibles dentro de `maxDjs`, rechazar con 400 `no_available_mount`
- [x] 3.3 En `streaming/agent/routes/streams.js`, en `GET /api/streams/:clientId/harbor/status` (línea ~344), agregar al response:
  - `planMaxDjs: <int>` (consulta `getPlanMaxDjs(clientId)`)
  - `availableMounts: string[]` (consulta `nextAvailableMount` en bucle, o query SQL que devuelva los integers 1..N excluyendo los ya usados)
- [x] 3.4 Mantener intactas las APIs sin cambios: `GET /status`, `POST /dj-takeover`, `DELETE /djs/:djId`, callbacks `harbor/connected` y `harbor/disconnected` (el comportamiento del ciclo AutoDJ ↔ DJ ya está correcto en `routes/streams.js:305` con `isAnyDjActive`)

## 4. Panel (Next.js) — UI sin listas hardcodeadas

- [x] 4.1 En `app/api/dashboard/streaming/connection/route.ts` (GET): pasar `planMaxDjs` y `availableMounts` desde la respuesta del agente al cliente del Panel
- [x] 4.2 En `app/dashboard/streaming/connection/page.tsx`:
  - Eliminar la constante `MOUNTS = ['/dj1', '/dj2', '/dj3', '/dj4']` (línea 26)
  - Añadir estado `planMaxDjs` y `availableMounts` desde la respuesta de `/api/dashboard/streaming/connection`
  - Cambiar la condición del botón "+ Nuevo DJ" de `djSlots.length >= 4` a `djSlots.length >= planMaxDjs`, con tooltip "Plan máximo: N DJs"
  - En el modal de creación, poblar el `<select>` de mount con `availableMounts` (los libres) en lugar del array literal
- [x] 4.3 En la misma página, actualizar el banner de estado "DJ en vivo" (línea 203) para que muestre todos los DJs conectados ordenados por rol (`owner > host > guest`) y luego por `priority` ascendente, unidos con " + "
- [x] 4.4 Verificar que el resto de la página (lista de slots, formulario de edición, tutorial de BUTT) sigue funcionando sin cambios

## 5. Pruebas manuales

- [ ] 5.1 Cliente con `Plan.maxDjs = 8`: crear 8 DJs con mounts `/dj1`…`/dj8`; el no debe rechazarse con `max_djs_reached`
- [ ] 5.2 Borrar el slot `/dj3` y crear uno nuevo → el nuevo recibe mount `/dj3`
- [ ] 5.3 Intentar `PATCH /djs/:djId` con un `mount` ya usado por otro slot → 409 `mount_in_use`
- [ ] 5.4 Conectar dos DJs a slots distintos en la misma radio; ambos aparecen en `activeDjs`; el banner del Panel muestra ambos nombres ordenados por rol/prioridad
- [ ] 5.5 Desconectar uno de los dos DJs → el otro sigue al aire, `status` permanece `live`, el banner muestra solo el que queda
- [ ] 5.6 Desconectar el último DJ → `status` pasa a `autodj`, AutoDJ reanuda, banner vuelve a "AutoDJ activo"
- [ ] 5.7 Cliente con plan legacy (`maxDjs IS NULL`): crear 4 DJs funciona; intentar el quinto se rechaza con `max_djs_reached` y `planMaxDjs: 4` en el body

> **Nota:** las pruebas 5.1–5.7 requieren un entorno con Docker activo. Se documentan paso a paso (con `curl` y rutas) en `streaming/PHASE-8-RESULTS.md`. Pendientes de ejecución humana antes de mergear a `main`.

## 6. Documentación y validación

- [x] 6.1 Documentar el cambio en `streaming/PHASE-8-RESULTS.md` con alcance, decisiones, pruebas manuales y migración aplicada
- [x] 6.2 Correr `openspec validate scale-and-stabilize-multi-dj --strict` (cuando Node esté disponible) para confirmar que los artefactos cumplen el schema
- [x] 6.3 Confirmar en `git diff` que no hay cambios fuera de los archivos listados en `affected_areas` del `.openspec.yaml`

## 7. Rollback (documentación)

- [x] 7.1 Documentar el procedimiento en `PHASE-8-RESULTS.md`: `prisma migrate resolve --rolled-back 20260816_plan_max_djs` + revert de commits del agente y del Panel. Los slots existentes no se ven afectados.