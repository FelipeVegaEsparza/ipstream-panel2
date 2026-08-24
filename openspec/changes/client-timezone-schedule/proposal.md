## Why

La parrilla horaria (radio y TV) evalúa "ahora" con `new Date()` del contenedor, que en producción corre en UTC. Un cliente que configura su franja a las "08:00" espera que suene a las 08:00 en su zona horaria, pero el sistema la interpreta como 08:00 UTC. Si hay clientes en zonas distintas (Chile, México, etc.), la misma franja significa horas diferentes para cada uno. No existe ningún concepto de timezone en el sistema.

## What Changes

- Agregar campo `timezone` al modelo `Client` (default `UTC`), persistido en DB y editable desde el dashboard.
- El agente evalúa la franja vigente ("ahora") en la zona horaria del cliente en vez de la zona del contenedor. Aplica a la parrilla de Radio (`schedule.js`) y de TV (`video-schedule.js`) por igual.
- La interfaz de parrilla muestra la zona horaria del cliente y las horas se interpretan como hora local del canal.
- Manejo de DST automático vía `Intl` (la zona se expresa como IANA, ej. `America/Santiago`).
- **BREAKING**: el significado de las horas ya configuradas en franjas existentes puede cambiar si el cliente cambia su zona; se documenta la migración.

## Capabilities

### New Capabilities
- `client-timezone`: Configuración y uso de la zona horaria por cliente para interpretar la parrilla horaria (radio y TV).

### Modified Capabilities
<!-- Ninguna: la parrilla horaria (radio) y la de TV no tienen spec previa que modificar; se captura la zona en la nueva capability. -->

## Impact

- **Prisma** (`prisma/schema.prisma`): campo `timezone` en `Client` + migración.
- **Agente** (`streaming/agent/`): `isTimeInSlot` (en `routes/schedule.js` y `routes/video-schedule.js`) calcula el momento actual en la zona del cliente; consulta la zona desde la DB.
- **Panel** (`app/dashboard/`): edición del timezone del cliente (sección de datos básicos o parrilla) y visualización de la zona en la parrilla.
- **MySQL crudo del agente**: la columna `timezone` debe existir en la tabla `clients` (creada por Prisma); el agente solo la lee.
