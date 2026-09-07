## Why

Los sitios web de cada radio/TV (PWA pública multi-tenant) van a mostrar un formulario de contacto para que oyentes/visitantes se comuniquen con el medio (auspicios, saludos, consultas). Hoy no existe ningún endpoint para recibir esas consultas ni un lugar en el panel donde el cliente las vea y administre, por lo que esas comunicaciones se perderían.

## What Changes

- **Modelo nuevo `ContactMessage`** (Prisma, tabla `contact_messages`): cada consulta queda persistida y ligada a un `clientId`, con `name`, `email`, `phone`, `message`, `status` (`new|read|resolved`), `ip?` e índices por `clientId` y `createdAt`.
- **Endpoint público nuevo** `POST /api/public/{clientId}/contact-messages` (CORS `*`, sin autenticación): recibe `name`, `email`, `phone` y `message` (todos obligatorios), valida y persiste la consulta del visitante, captura la IP, aplica rate limit por IP y devuelve `201 { id, status: "new", createdAt }`. Errores `400` (validación) y `429` (rate limit). Solo acepta los campos del contrato; no inventa campos.
- **Endpoints de panel nuevos** (solo autenticado, aislados por el cliente efectivo de la sesión, patrón `getEffectiveClient`):
  - `GET /dashboard/contact-messages` → lista paginada, ordenada por fecha descendente.
  - `PATCH /dashboard/contact-messages/:id` → cambia estado (`new|read|resolved`).
  - `DELETE /dashboard/contact-messages/:id` → elimina la consulta.
  - `GET /dashboard/contact-messages/unread-count` → número de mensajes pendientes (`new`) del cliente.
- **Sección nueva en el panel** "Mensajes de contacto" (`/dashboard/contact-messages`, sección *Interactivos*): muestra la bandeja con estado por defecto `new`, ordenada por fecha descendente, con las acciones leer/resolver y eliminar, y permite ver `email`, `phone` e `ip` para responder desde la casilla del operador. El ítem del menú muestra un **contador de pendientes por ver** (`new`).
- **Docs**: actualizar `instruccionesapi.md` con el endpoint público y la página `/dashboard/api-test`.

## Capabilities

### New Capabilities

- `public-api/contact-messages`: endpoints públicos de la API REST que permiten a un visitante del sitio de un cliente enviar una consulta de contacto, con validación, protección anti-spam (rate limit por IP) y persistencia multi-tenant ligada al `clientId`.
- `dashboard/contact-messages`: bandeja de mensajes de contacto del panel de un cliente, que lista, permite cambiar de estado y eliminar las consultas recibidas desde el sitio público, siempre aisladas por cliente.

### Modified Capabilities

- Ninguna: no hay spec previa de mensajes de contacto; el comportamiento nuevo queda contenido en las dos capacidades nuevas.

## Impact

- **Panel** — datos: `prisma/schema.prisma` (modelo `ContactMessage` + relación con `Client`) y migración.
- **Panel** — API pública: `app/api/public/[clientId]/contact-messages/route.ts` (POST). Reutiliza `lib/cors.ts` (respuestas con CORS y error 400/429), `lib/rate-limit.ts` (5 mensajes / 10 min por IP) y validaciones nuevas en `lib/validations.ts`.
- **Panel** — API dashboard: `app/api/dashboard/contact-messages/route.ts` (GET listado y GET `unread-count`) y `app/api/dashboard/contact-messages/[id]/route.ts` (PATCH/DELETE), con `getServerSession` + `getEffectiveClient` para no cruzar clientes.
- **Panel** — UI: página nueva `app/dashboard/contact-messages/page.tsx`, alta en `lib/menu-items.ts` (sección "Interactivos") con badge de pendientes en el sidebar (`components/dashboard/Sidebar.tsx`) y componentes de listado/acciones.
- **Docs**: `instruccionesapi.md` e índice de la página `/dashboard/api-test` (`app/dashboard/api-test/page.tsx`).
- **Deploy**: toca solo el panel (no `streaming/agent/*`) → no requiere pulsar **"Actualizar nodo"** en los nodos remotos.

## Assumptions

- El panel resuelve el cliente a partir de la sesión/impersonación (`getEffectiveClient`, igual que chat y soporte); la URL del contrato muestra `?clientId=` como referencia del cliente efectivo, pero las queries siempre se filtran por `effective.clientId` para no romper el multi-tenant.
- El formulario de contacto del sitio recoge solo `name`, `email`, `phone` y `message` (sin asunto); los cuatro son obligatorios.
- Límites razonables concretos (se fijan en el diseño): `name` ≤ 120, `email` ≤ 254 y formato válido, `phone` ≤ 40, `message` ≤ 2000.
