## Context

La parrilla horaria de radio (`routes/schedule.js`) y de TV (`routes/video-schedule.js`) resuelve la franja vigente con `new Date()` del contenedor. En producción los contenedores corren en UTC mientras el host está en CEST (UTC+2); clientes en otras zonas se ven aún más afectados. No hay campo de zona horaria en `Client` (schema.prisma) ni en la tabla `clients` que el agente consulta por MySQL crudo.

## Goals / Non-Goals

**Goals:**
- Almacenar la zona horaria por cliente (IANA, default `UTC`), editable desde el panel.
- Que radio y TV evalúen la franja vigente en la zona del cliente (día de la semana y hora).
- DST manejado automáticamente.
- Mostrar la zona en la interfaz de parrilla.

**Non-Goals:**
- Conversión de zonas al crear/editar franjas (las horas de la franja siempre representan hora local del canal; no se guarda la zona por franja).
- Zona horaria por franja individual ni por sesión de usuario del panel.
- Sincronización con la zona del navegador del operador.

## Decisions

### 1. Campo `timezone` en `Client` (Prisma + MySQL)
Se agrega `timezone String @default("UTC")` al modelo `Client`. El agente lee la columna de la tabla `clients` con MySQL crudo (ya comparte la misma DB). La columna se crea con la migración de Prisma; si la tabla ya existe, el arranque del agente usa un `ALTER TABLE` idempotente con `information_schema` (mismo patrón que el fix de `isActive` en video), para que el agente no dependa del orden de migración de Prisma.
- **Alternativa**: guardar la zona en `radio_streams`/`video_streams` → descartada: el timezone es una propiedad del cliente/canal, no del stream, y duplicarla en dos tablas complica la edición.

### 2. Resolución del "ahora" en zona del cliente (agente)
`isTimeInSlot` pasa a recibir la zona y calcula día/hora con `Intl.DateTimeFormat('en-US', { timeZone, hour12: false, weekday, hour, minute })` sobre la misma instancia de `Date`, sin mutarla. Radio y TV consultan `SELECT timezone FROM clients WHERE id = ?` y la pasan a la función. Si la zona falta o es inválida, cae a `UTC`.
- **Alternativa**: usar `moment-timezone` → descartada: `Intl` nativo es suficiente, sin dependencias nuevas.
- **Alternativa**: `getTimezoneOffset` del servidor → descartada: no refleja la zona del cliente.

### 3. UI de edición del timezone
Se agrega un selector de zona horaria (lista de identificadores IANA con `Intl.supportedValuesOf('timeZone')`) en el panel. Dado que hay una sola página de parrilla por servicio, la edición vive en una sección de configuración del cliente (p.ej. datos básicos) y/o en la propia página de parrilla. La parrilla muestra la zona junto al encabezado ("Horario: America/Santiago").
- **Alternativa**: input libre → descartada: un selector evita zonas inválidas y simplifica la validación.

### 4. Validación de la zona
El endpoint de guardado valida que el valor sea un identificador IANA soportado (try/catch sobre `Intl.DateTimeFormat` con esa zona, o comparación contra `Intl.supportedValuesOf`). Valor inválido → rechazo sin persistir.

### 5. Migración de franjas existentes
Al cambiar la zona de un cliente, las franjas se reinterpretan en la nueva zona (no se reescriben las horas). Se muestra un aviso en la UI del efecto sobre los horarios vigentes.
- **Alternativa**: convertir horas al cambiar zona → descartada: cambia el significado de "08:00" que el operador ya entiende como hora local; la re-interpretación es más predecible.

## Risks / Trade-offs

- **Cambio de significado de franjas al cambiar zona** → [Riesgo] Mitigación: aviso en la UI y documentación en la migración; el default `UTC` no afecta a clientes que no lo configuren.
- **Zona inválida en DB existente** → [Riesgo] Mitigación: el agente cae a `UTC` ante valores inválidos o nulos; nunca rompe el cron.
- **DST y franjas que cruzan medianoche** → [Riesgo] Mitigación: `Intl` resuelve la hora local en cada momento; la lógica de cruce de medianoche se conserva sobre los minutos de esa zona.
- **Costo por query del agente** → [Riesgo] Mitigación: el cron ya consulta la DB por cliente; una columna extra no añade costos relevantes.

## Migration Plan

1. Migración Prisma: `ALTER TABLE clients ADD COLUMN timezone VARCHAR(191) NOT NULL DEFAULT 'UTC'` (vía `prisma db push`/migrate en el deploy).
2. El agente lee la columna; si no existe, el ALTER idempotente de arranque la crea antes de usarla (mismo patrón que `video_playlists.isActive`).
3. Rollback: quitar el campo de la UI y revertir la evaluación a la zona del contenedor; la columna puede permanecer sin uso.

## Open Questions

- Ninguna: el default de zona para clientes nuevos (`UTC`) y la ubicación exacta del selector (datos básicos vs parrilla) se definen en tasks; la elección no altera specs.
