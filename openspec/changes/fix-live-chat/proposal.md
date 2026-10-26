# Proposal

## Why

El chat en vivo tiene backend, panel de moderación y un módulo de PWA, pero el módulo nunca se monta en el sitio público. Además, el contrato de mensajes está incompleto: la PWA carga los mensajes más antiguos, el dashboard pide `since` a una API que lo ignora y el email obligatorio no coincide con la UI. El resultado es un chat que no se ve o que pierde mensajes.

## What Changes

- Montar el chat en la PWA: sección **Chat en vivo** en el home y botón flotante en el resto de páginas (el flotante se oculta en el home cuando ya existe la sección).
- Respetar el permiso del menú **Chat en Vivo**: si está deshabilitado, la PWA lo oculta y las APIs públicas y del dashboard lo bloquean.
- Corregir el contrato de mensajes:
  - Sin `since`: últimos N mensajes, en orden ascendente.
  - Con `since`: mensajes posteriores al cursor, ascendentes, con `nextCursor` y `hasMore`.
- Corregir el cursor de la PWA y del dashboard para no perder mensajes ni retroceder.
- Hacer obligatorio el email del oyente en la PWA, con validación clara.
- Unificar el autor de staff como `staff` en la PWA (hoy compara con `admin`).
- Agregar guard de menú a la página y APIs del dashboard de chat.
- Agregar el cron de limpieza de chat a los scripts de despliegue y corregir la documentación de `CRON_SECRET`.
- Corregir el conteo de “oyentes activos” para excluir al staff.
- Ampliar tests de cursor, permisos, email, staff y paginación.

## Capabilities

### New Capabilities

- `chat/live`: disponibilidad, permisos, paginación incremental y presentación del chat en vivo en el sitio público y el dashboard.

### Modified Capabilities

Ninguna.

## Impact

- **PWA**: `ChatSection` corregido, sección en `sections.ts`/`ContentSections`, widget flotante en `App.tsx`, tipos y cliente API.
- **APIs**: rutas públicas y de dashboard de chat con cursor, `nextCursor`/`hasMore` y guard de menú.
- **Dashboard**: guard de menú en página y APIs; polling corregido.
- **Datos públicos**: `chatEnabled` en `FullClientData` y en el agregado público.
- **Operación**: nuevo `deploy/scripts/cron-chat.sh`, documentación y README.
- **Tests**: rutas de chat, paginación, permisos y `ChatSection`.
- No toca el agente de streaming ni requiere “Actualizar nodo”.
