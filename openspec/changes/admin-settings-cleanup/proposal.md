## Why

La sección `/admin/settings` mostraba 5 pestañas, pero 3 de ellas (Seguridad, Notificaciones, Respaldos) eran shells de UI sin backend. Además, la pestaña **Sistema** (`SystemSettings`) muestra **9 ajustes editables**, de los cuales solo 1 (`enableGenericNews`) tiene backend real y uso en la app: los otros 8 (`siteName`, `siteDescription`, `sessionTimeout`, `maxUsersPerClient`, `maxContentPerClient`, `maintenanceMode`, `allowRegistration`, `debugMode`) se "editan" pero no se guardan ni se usan en ningún lado (no hay columnas en `AppConfig`, ni gates en middleware/auth). También muestra "Tamaño BD" hardcodeado a `'0 MB'` (placeholder).

## What Changes

- Eliminar la pestaña **Seguridad** (`SecuritySettings`) de `/admin/settings`.
- Eliminar la pestaña **Notificaciones** (`NotificationSettings`) de `/admin/settings`.
- Eliminar la pestaña **Respaldos** (`BackupSettings`) de `/admin/settings`.
- Dejar `/admin/settings` con solo las pestañas **Sistema** (`SystemSettings`) y **Login** (`LoginBackgroundSettings`).
- Eliminar los componentes ahora huérfanos (`SecuritySettings`, `NotificationSettings`, `BackupSettings`).
- **Recortar `SystemSettings`**: quitar los 8 ajustes decorativos, dejando solo `enableGenericNews` (el único funcional). Dejar las stats reales (usuarios, clientes, contenido, uptime, node) y eliminar "Tamaño BD" (placeholder sin cálculo real).

## Capabilities

### New Capabilities
<!-- Ninguna: cambio de remoción de UI, no introduce capability nueva. -->

### Modified Capabilities
<!-- Ninguna: no cambia comportamiento de capabilities existentes (la UI de settings no tiene spec propia). -->

## Impact

- **UI** (`app/admin/settings/page.tsx`): quitar 3 pestañas del `TabsList` y sus `TabsContent`.
- **Componentes** (`components/admin/`): eliminar `SecuritySettings.tsx`, `NotificationSettings.tsx`, `BackupSettings.tsx`; recortar `SystemSettings.tsx` a solo `enableGenericNews` + stats reales.
- **Sin cambios de backend**: los endpoints inexistentes quedan como estaban; `app-config` no se toca.
- **Sin cambios de datos**: no hay modelos Prisma que tocar.
