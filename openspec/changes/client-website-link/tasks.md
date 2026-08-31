## 1. Modelo de datos

- [x] 1.1 Agregar la columna `websiteUrl String?` al modelo `BasicData` en `prisma/schema.prisma` (nullable, sin default).
- [x] 1.2 Aplicar el esquema (migración/`prisma db push`) y regenerar el cliente de Prisma.

## 2. Validación

- [x] 2.1 Agregar `websiteUrl` al `basicDataSchema` en `lib/validations.ts` (URL opcional o cadena vacía).
- [x] 2.2 Agregar `websiteUrl` a los esquemas `createUserSchema`/`editUserSchema` del admin (URL opcional o cadena vacía).

## 3. Admin: campo "Sitio web del cliente"

- [x] 3.1 En `components/admin/UserForm.tsx`, agregar el campo "Sitio web del cliente" en la sección "Información del Proyecto", con validación y estado inicial desde `initialData`.
- [x] 3.2 En `app/api/admin/users/[id]/route.ts` (PUT), guardar `websiteUrl` en `BasicData` del cliente (upsert por clientId), aislado de la actualización del usuario.
- [x] 3.3 En `app/admin/users/[id]/edit/page.tsx`, exponer `websiteUrl` del cliente en los `formData` que recibe `UserForm`.

## 4. Dashboard: botón "Ir a mi sitio Web"

- [x] 4.1 En `app/dashboard/layout.tsx`, consultar `basicData.websiteUrl` del cliente efectivo y pasarlo como prop a `DashboardLayoutClient`.
- [x] 4.2 En `components/dashboard/DashboardLayoutClient.tsx`, propagar `websiteUrl` a `Header`.
- [x] 4.3 En `components/dashboard/Header.tsx`, agregar el botón "Ir a mi sitio Web" (enlace `target="_blank"` con `rel="noopener noreferrer"`) solo si `websiteUrl` está presente.

## 5. Verificación final

- [ ] 5.1 Verificar en `/admin/users/[id]/edit` que el campo se guarda/carga y que una URL inválida se rechaza.
- [ ] 5.2 Verificar en el dashboard del cliente que el botón "Ir a mi sitio Web" aparece solo con URL configurada y abre el sitio en pestaña nueva.
- [x] 5.3 Ejecutar `tsc --noEmit` y revisar `openspec validate` del cambio.
