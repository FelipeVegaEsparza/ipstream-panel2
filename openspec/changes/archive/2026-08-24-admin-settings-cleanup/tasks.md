## 1. UI — Limpiar /admin/settings

- [x] 1.1 Editar `app/admin/settings/page.tsx`: quitar imports y `TabsContent` de Seguridad, Notificaciones y Respaldos; reducir `TabsList` a `grid-cols-2` con Solo Sistema y Login.
- [x] 1.2 Eliminar los componentes huérfanos: `components/admin/SecuritySettings.tsx`, `components/admin/NotificationSettings.tsx`, `components/admin/BackupSettings.tsx`.

## 2. Recortar la sección Sistema

- [x] 2.1 En `SystemSettings.tsx`: eliminar la entrada "Tamaño BD" (placeholder) de las stats, manteniendo las stats reales.
- [x] 2.2 En `SystemSettings.tsx`: eliminar los 8 ajustes decorativos de Configuración General (siteName, siteDescription, sessionTimeout, maxUsersPerClient, maxContentPerClient, maintenanceMode, allowRegistration, debugMode), dejando solo el switch de Noticias Genéricas.
- [x] 2.3 Limpiar el estado local y los imports no usados de `SystemSettings.tsx`.

## 3. Verificación

- [x] 3.1 `npx tsc --noEmit` sin errores nuevos.
- [x] 3.2 Verificar en producción que `/admin/settings` muestra solo Sistema y Login y que el resto de la app no referencia componentes eliminados.
- [x] 3.3 Verificar en producción que la sección Sistema muestra solo stats reales + el switch de Noticias Genéricas.
