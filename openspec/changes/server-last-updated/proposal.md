# Proposal

## Why

En `/admin/servers`, la card de cada nodo no indica cuándo fue la última vez que se actualizó su código/stack. Sin esa referencia, el administrador no puede saber si un nodo remoto ya recibió el último "Actualizar nodo" o si quedó desactualizado tras un deploy.

## What Changes

- Mostrar en la card de cada servidor de `/admin/servers` la **fecha y hora de la última actualización del nodo**.
- La fecha/hora corresponde a la última ejecución completada de "Actualizar nodo" (o de la provisión inicial), reutilizando el campo `provisionedAt` que ya se persiste y ya devuelve la API.
- Cuando el servidor nunca fue (re)actualizado, la card muestra un estado vacío claro (p. ej. "—") en lugar de una fecha falsa.

Supuestos registrados:
- "Última vez que se actualizó el servidor" = última actualización del código/stack del nodo, **no** la última edición de su configuración en el admin ni el último health check.

## Capabilities

### New Capabilities

- `admin/servers`: gestión de nodos de streaming en el panel de administración, incluyendo el estado de provisión/actualización visible en la card de cada servidor.

### Modified Capabilities

<!-- Sin cambios en admin/monitoring. -->

## Impact

- **UI**: `components/admin/StreamingServersManager.tsx` (card del servidor).
- **API**: `GET /api/admin/servers` ya devuelve `provisionedAt`; no requiere cambios.
- **Datos**: `StreamingServer.provisionedAt` (ya existe; se setea al completar provisión y actualización en `lib/node-provisioner.ts`). Sin migración.
- Sin cambios en el agente de streaming ni en nodos remotos.
