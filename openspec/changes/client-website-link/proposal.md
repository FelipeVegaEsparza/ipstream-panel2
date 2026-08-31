## Why

Cada cliente tiene su propio sitio web público (donde se expone la información del panel: reproductor de streaming, noticias, programas, etc.), pero el panel **no guarda esa URL** ni le da acceso al cliente desde su dashboard. El cliente solo ve sus URLs de streaming (radio/video) en Datos Básicos, no tiene forma de llegar a su sitio web. Falta un campo para que el admin registre la URL del sitio del cliente y un botón en el dashboard que lleve ahí.

## What Changes

- **Nuevo campo `websiteUrl` en `BasicData`**: el admin registra la URL del sitio web público del cliente (solo el admin la configura, no el cliente).
- **Editable desde el admin**: en el formulario de edición de cliente (`UserForm` en `/admin/users/[id]/edit`), un campo "Sitio web del cliente" con validación de URL.
- **Botón "Ir a mi sitio Web" en el header del dashboard**: cuando el cliente tiene `websiteUrl` cargada, el header del dashboard (`Header.tsx`) muestra un botón/enlace que abre ese sitio en una pestaña nueva.
- **Solo si hay URL**: si el cliente no tiene `websiteUrl`, el botón no aparece.

## Capabilities

### New Capabilities

- `client/site-url`: registro de la URL del sitio web público de cada cliente (configurada por el admin) y acceso desde el dashboard del cliente mediante un botón "Ir a mi sitio Web".

### Modified Capabilities

- Ninguna: no existe spec previa de datos básicos del cliente; el comportamiento nuevo queda en la capacidad `client/site-url`.

## Impact

- **Prisma**: nueva columna `websiteUrl String?` en `BasicData` (`basic_data`).
- **Validación**: agregar `websiteUrl` al `basicDataSchema` en `lib/validations.ts` (URL opcional o vacío).
- **Admin UI**: en `components/admin/UserForm.tsx` (y su esquema) un campo "Sitio web del cliente"; el PUT de `/api/admin/users/[id]` guarda la URL en `BasicData`.
- **Dashboard header**: en `components/dashboard/Header.tsx` (client component) se agrega el botón "Ir a mi sitio Web"; la URL se obtiene del layout (`app/dashboard/layout.tsx`) o de un endpoint que devuelva el `websiteUrl` del cliente efectivo.
- **API**: si se decide resolver vía fetch desde el header, un endpoint (p.ej. `GET /api/dashboard/basic-data` ya existente) debe exponer `websiteUrl`.
- **Config/Deploy**: solo migración de columna; sin cambios de agentes ni nodos.
