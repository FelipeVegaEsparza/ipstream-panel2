## 1. UI — Limpiar /admin/settings

- [x] 1.1 Editar `app/admin/settings/page.tsx`: quitar imports y `TabsContent` de Seguridad, Notificaciones y Respaldos; reducir `TabsList` a `grid-cols-2` con Solo Sistema y Login.
- [x] 1.2 Eliminar los componentes huérfanos: `components/admin/SecuritySettings.tsx`, `components/admin/NotificationSettings.tsx`, `components/admin/BackupSettings.tsx`.

## 2. Verificación

- [x] 2.1 `npx tsc --noEmit` sin errores nuevos.
- [ ] 2.2 Verificar en producción que `/admin/settings` muestra solo Sistema y Login y que el resto de la app no referencia componentes eliminados.
