## Why

La sección `/admin/settings` muestra 5 pestañas, pero 3 de ellas (Seguridad, Notificaciones, Respaldos) son shells de UI sin backend: los endpoints que llaman no existen (`/api/admin/settings/security`, `/notifications`, `/backup`, `/test-email`, `/generate-api-key`), los datos son locales/hardcodeados y el botón "Guardar" siempre falla. Además, la necesidad de respaldos ya está cubierta por los respaldos periódicos del proveedor del VPS (Contabo), por lo que una sección de backups en el panel es redundante.

## What Changes

- Eliminar la pestaña **Seguridad** (`SecuritySettings`) de `/admin/settings`.
- Eliminar la pestaña **Notificaciones** (`NotificationSettings`) de `/admin/settings`.
- Eliminar la pestaña **Respaldos** (`BackupSettings`) de `/admin/settings`.
- Dejar `/admin/settings` con solo las pestañas **Sistema** (`SystemSettings`) y **Login** (`LoginBackgroundSettings`), que son las únicas funcionales.
- Eliminar los componentes ahora huérfanos (`SecuritySettings`, `NotificationSettings`, `BackupSettings`) y sus imports de `page.tsx`.

## Capabilities

### New Capabilities
<!-- Ninguna: cambio de remoción de UI, no introduce capability nueva. -->

### Modified Capabilities
<!-- Ninguna: no cambia comportamiento de capabilities existentes (la UI de settings no tiene spec propia). -->

## Impact

- **UI** (`app/admin/settings/page.tsx`): quitar 3 pestañas del `TabsList` y sus `TabsContent`.
- **Componentes** (`components/admin/`): eliminar `SecuritySettings.tsx`, `NotificationSettings.tsx`, `BackupSettings.tsx`.
- **Sin cambios de backend**: los endpoints inexistentes quedan como estaban (nunca se crean).
- **Sin cambios de datos**: no hay modelos Prisma que tocar.
