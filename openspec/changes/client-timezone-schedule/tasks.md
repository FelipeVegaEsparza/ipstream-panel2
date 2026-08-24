## 1. Modelo de datos

- [x] 1.1 Agregar `timezone String @default("UTC")` al modelo `Client` en `prisma/schema.prisma`.
- [x] 1.2 Aplicar la migración (`prisma db push` o migrate) y verificar que la columna existe en la DB de producción.

## 2. Agente — Evaluación de franja en la zona del cliente

- [x] 2.1 Crear helper compartido que dado un `Date`, una zona IANA y los límites `HH:mm`, resuelva día de la semana y minutos en esa zona usando `Intl.DateTimeFormat` (con fallback a `UTC` si la zona es inválida o faltante).
- [x] 2.2 Modificar `isTimeInSlot` en `streaming/agent/routes/schedule.js` para recibir la zona del cliente y resolver el "ahora" en ella.
- [x] 2.3 Modificar `isTimeInSlot` en `streaming/agent/routes/video-schedule.js` de igual forma.
- [x] 2.4 En las rutas que resuelven la franja vigente (`/schedule/current` y `applyScheduleForClient` de radio y TV), leer `timezone` del cliente desde la tabla `clients` y pasarlo a la evaluación.
- [x] 2.5 Agregar `ALTER TABLE` idempotente (patrón `information_schema`) en el arranque del agente para asegurar la columna `timezone` en `clients`, independiente del orden de migración de Prisma.

## 3. Panel — Endpoint y UI de configuración

- [x] 3.1 Crear endpoint de API para leer/actualizar el `timezone` del cliente (validando que sea un identificador IANA soportado; inválido → rechazo sin persistir).
- [x] 3.2 Agregar selector de zona horaria (lista de `Intl.supportedValuesOf('timeZone')`) en el panel, en la sección de configuración del cliente o en la página de parrilla.
- [x] 3.3 Mostrar la zona horaria del cliente en el encabezado de la parrilla de radio y de TV ("Horario: America/Santiago").
- [x] 3.4 Aviso en la UI al cambiar la zona: las franjas existentes se reinterpretan en la nueva zona.

## 4. Verificación

- [x] 4.1 `npx tsc --noEmit` sin errores nuevos.
- [ ] 4.2 En producción: configurar la zona del cliente, crear franja, verificar que `/schedule/current` la resuelve en la zona configurada (radio y TV).
- [ ] 4.3 Verificar el cron aplica el cambio de playlist en la zona del cliente (isActive + reinicio del encoder).
