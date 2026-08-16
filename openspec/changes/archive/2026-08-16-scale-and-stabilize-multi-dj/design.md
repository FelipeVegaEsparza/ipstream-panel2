## Context

El sistema multi-DJ tiene la mayor parte de la infraestructura: tabla `radio_djs`, generador de scripts que crea un `input.harbor()` por slot (`streaming/agent/lib/script-generator.js:84-99`), fallback chain `fallback(track_sensitive=false, [djSlots..., autodj])` (`script-generator.js:122`), callbacks `on_connect`/`on_disconnect` que llaman al agente vía `system("curl … POST /harbor/connected?dj=/djX&token=…")` (`script-generator.js:94`), y un `Map` en memoria (`_djActive` en `routes/streams.js`) que rastrea qué slots están activos por radio.

La limitación concreta que este cambio cierra está concentrada en cuatro sitios donde el número 4 está hardcodeado: `streaming/agent/routes/streams.js:619, 638, 682` y `app/dashboard/streaming/connection/page.tsx:26`. La arquitectura Liquidsoap ↔ Icecast ↔ agente ↔ Panel se mantiene intacta. Ver `proposal.md` para motivación.

Este es un cambio de **endurecimiento del camino feliz existente**, no un rediseño. Se preserva la compatibilidad hacia atrás en todas las APIs existentes; los nuevos campos son aditivos.

## Goals / Non-Goals

**Goals:**
- Eliminar el `>= 4` hardcodeado en el agente y en el Panel.
- Asignar mounts dinámicamente como `/dj1`, `/dj2`, …, `/djN` (sin huecos al reusar), con N leído de `Plan.maxDjs` (entero, no nulo).
- Validar que el ciclo AutoDJ ↔ DJ sigue correcto cuando hay N DJs simultáneos (el callback de disconnect en `routes/streams.js:305` ya consulta `isAnyDjActive(mount)`, por lo que la lógica central existe; este cambio verifica que sigue funcionando con el cap elevado).
- UI del Panel sin listas hardcodeadas; consume `availableMounts` del agente.
- Banner "DJ en vivo" muestra todos los DJs conectados cuando hay más de uno.

**Non-Goals:**
- Tabla `live_sessions` ni historial de sesiones (futuro cambio).
- Persistencia/recuperación de sesiones tras reinicio del agente (futuro cambio, vía Icecast `/status-json.xsl`).
- Endpoint `POST /djs/:djId/kick` (futuro cambio).
- Endpoint o semántica `rotate-password` con restart (futuro cambio; el PATCH actual sigue regenerando el script sin restart, comportamiento actual sin cambios).
- Dashboard dedicado para DJs (futuro cambio).
- `DjSchedule` — scheduler de turnos (futuro cambio).
- `User.role = 'DJ'`, `ClientMembership`, `RadioDj.userId` — identidad de DJ (futuro cambio).
- Puerto harbor dedicado por slot (se mantiene compartido por cliente, como hoy).
- `maxDjs = null` (sin tope) — no se soporta en este cambio.
- Cross-fade entre DJ ↔ AutoDJ (futuro cambio).
- Renumerar mounts existentes al actualizar el plan.

## Decisions

### D1: `Plan.maxDjs` como columna entera, no nullable
`Plan.maxDjs Int @default(4)` con `NOT NULL`. Migración con backfill automático en MySQL (`ADD COLUMN ... NOT NULL DEFAULT 4`), que rellena todas las filas existentes con 4 y preserva el comportamiento actual.

**Por qué:**
- El usuario pidió explícitamente "maxDjs debe tener un valor entero definido por el Plan".
- `null` como "ilimitado" abre un vector de abuso (un admin con un typo configura 99999 DJs).
- Si en el futuro se quiere ilimitado, se modela como una columna distinta (`Plan.unlimitedDjs Bool`) o un valor sentinel (`-1`) en un cambio separado.

**Alternativa considerada:** `maxDjs Int?` con null = ilimitado y un cap de defensa (50) en el generador. Descartada por la directriz explícita del usuario.

### D2: Asignación secuencial sin huecos al reusar mounts borrados
Cuando un slot `/dj2` se borra, el siguiente DJ creado recibe `/dj2`, no `/dj5`. La función `nextAvailableMount(clientId, planMaxDjs)` devuelve el entero más bajo libre entre 1 y `planMaxDjs`.

**Por qué:**
- Comportamiento predecible: si ves `/dj3`, sabes que 1 y 2 existen o existieron.
- Reduce fragmentación del namespace de mount.
- Coherente con el comportamiento actual cuando había 4 fijos: `/dj1`, `/dj2`, …, `/dj4`.

**Alternativa considerada:** UUIDs como mounts (`/dj_a3f9`). Descartada: rompe scripts de encoder que asumen prefijo `/dj`.

### D3: Cap de defensa de 50 en el script-generator
Independientemente de `Plan.maxDjs`, el `script-generator.js` rechaza generar un `.liq` con más de 50 inputs `input.harbor()` y registra un error. Si `Plan.maxDjs > 50`, devuelve `500 { error: "max_djs_hard_limit", hardLimit: 50 }` al cliente que intenta crear el slot 51.

**Por qué:**
- Defensa en profundidad contra typos o valores absurdos del admin.
- 50 DJs simultáneos por radio ya cubre el 99 % de casos reales; excederlo es operacionalmente sospechoso.
- Evita un `.liq` de tamaño patológico que pueda tumbar el proceso Liquidsoap.

**Alternativa considerada:** permitir cualquier valor y confiar en el admin. Descartada por el riesgo operacional.

### D4: `harbor/status` extendido aditivamente
El endpoint agrega `planMaxDjs` (int) y `availableMounts` (string[]). Campos existentes (`harborPort`, `activeDjs`, `slots`, `icecastMount`, `status`) sin cambios.

**Por qué:**
- Compatibilidad hacia atrás garantizada: cualquier consumidor que solo lea `harborPort` sigue funcionando.
- El Panel es el único consumidor conocido y se actualiza en el mismo cambio.

**Alternativa considerada:** un endpoint nuevo `/api/streams/:clientId/djs/plan-info`. Descartada: fragmenta la información; mejor una sola respuesta autoritativa.

### D5: UI consume `availableMounts` y `planMaxDjs` del agente
`app/dashboard/streaming/connection/page.tsx` elimina la constante `MOUNTS = ['/dj1', '/dj2', '/dj3', '/dj4']` y consume los campos nuevos del GET. El botón "+ Nuevo DJ" cambia su condición de `djSlots.length >= 4` a `djSlots.length >= planMaxDjs`.

**Por qué:**
- Una sola fuente de verdad (el agente).
- Cuando subamos el plan, la UI se actualiza sola.

**Alternativa considerada:** pasar `planMaxDjs` en sesión de NextAuth y calcular mounts en el Panel. Descartada: introduce estado duplicado.

### D6: Banner multi-DJ con orden por rol y prioridad
Cuando hay >1 DJs conectados, la cabecera muestra `DJ en vivo: Ana (owner) + Luis (guest)` con todos los nombres ordenados por jerarquía de rol (`owner > host > guest`) y, dentro del mismo rol, por `priority` ascendente.

**Por qué:**
- Coherente con la lógica de fallback ya existente en `script-generator.js` (los DJs con mayor rol/prioridad toman el aire primero; cuando hay varios conectados, el orden visual refleja eso).
- El usuario ya especificó esta regla en su directriz.

**Alternativa considerada:** orden por `connectedAt` (primero en llegar, primero en listar). Descartada: menos informativo para oyentes que conocen a los DJs por rol.

### D7: Compatibilidad de mounts existentes
Los slots actualmente configurados con mounts `/dj1`, `/dj2`, `/dj3`, `/dj4` **no se renumeran**. El nuevo `nextAvailableMount` ve esos mounts como ocupados y asigna `/dj5` al siguiente DJ si `Plan.maxDjs >= 5`.

**Por qué:**
- Renumerar rompería los scripts de encoder de los DJs ya conectados (BUTT/MIXXX tienen el mount hardcodeado).
- Cero impacto para los clientes existentes.

**Alternativa considerada:** renumerar al migrar. Descartada por breaking change en clientes ya desplegados.

## Risks / Trade-offs

- **[R1] Dropdown con hasta 49 opciones es incómodo** → Aceptable para v1. El caso realista son 8-16 DJs. v2 puede reemplazarlo por un input numérico libre o asignación automática server-side.
- **[R2] Si `Plan.maxDjs` se reduce de 16 a 4, los slots 5-16 quedan huérfanos** → Documentado. No se borran automáticamente (no haríamos daño al cliente). El admin debe borrarlos manualmente. Aceptable.
- **[R3] Migración de planes existentes con columna nueva** → MySQL `ADD COLUMN maxDjs INT NOT NULL DEFAULT 4` rellena toda la tabla en una sola operación. Bloquea la tabla brevemente en producción. Para tablas grandes (>100k filas) evaluar `pt-online-schema-change`. En este proyecto las tablas son pequeñas.
- **[R4] El watcher cron no se modifica** → El comportamiento del watcher (`dj-watcher.js`) sigue siendo solo respaldo para detectar `status='live'` con `_djActive` vacío. Como `_djActive` es por mount y se actualiza por callback de harbor, sigue funcionando con N DJs. Sin cambios necesarios.
- **[R5] Inconsistencia temporal entre cap del plan y mounts disponibles** → Si el admin baja `maxDjs` mientras hay un DJ conectándose, la asignación puede usar un mount ahora fuera del cap. No es problema de seguridad pero podría sorprender. Mitigado por la baja frecuencia esperada del cambio de plan.

## Migration Plan

1. **Schema Prisma**: nueva migración `20260816_plan_max_djs` que añade `maxDjs Int @default(4)` a `Plan`. La migración generada por Prisma usa `ADD COLUMN maxDjs INT NOT NULL DEFAULT 4` que MySQL rellena in-place.
2. **Agente**: sin auto-migración nueva (la columna ya viene del Panel vía JOIN). El helper `getPlanMaxDjs(clientId)` hace `SELECT maxDjs FROM plans WHERE id = ?` con fallback a 4 si el valor es `NULL` o la fila no existe (defensa contra planes huérfanos).
3. **Backfill**: la columna nueva con `DEFAULT 4` rellena todas las filas existentes automáticamente. No hace falta script adicional.
4. **Compatibilidad**: el cambio es compatible hacia atrás. Slots existentes con mounts `/dj1`…`/dj4` siguen funcionando. El cap del plan aplica solo a slots nuevos.
5. **Despliegue**: aplicar la migración Prisma primero (`prisma migrate deploy`), reiniciar el agente (recoge los cambios en `routes/streams.js`), reiniciar el Panel último (consume los nuevos campos del agente).
6. **Rollback**: revertir la migración Prisma (`prisma migrate resolve --rolled-back 20260816_plan_max_djs`) y revertir los commits del agente y del Panel. Los slots existentes con sus mounts no se ven afectados.

## Open Questions

- ¿El helper `getPlanMaxDjs` debe cachear el valor en memoria del agente para evitar un JOIN por cada operación CRUD de DJ? **Decidido: no en este cambio**. Una query por DJ CRUD es trivial. Si en el futuro se ve carga, se cachea.
- ¿El cap de defensa (50) debe ser configurable? **Decidido: hardcodeado en este cambio**. Es defensa, no regla de negocio. Si se necesita ajustar, es una constante en `script-generator.js`.