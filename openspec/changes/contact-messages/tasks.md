## 1. Persistencia — modelo Prisma y migración

- [x] 1.1 Agregar en `prisma/schema.prisma` el modelo `ContactMessage` (id cuid, clientId, name VarChar(120), email VarChar(254), phone VarChar(40) obligatorio, message Text, status String default "new" con comentario de valores, ip VarChar(45) ?, createdAt/updatedAt, relación a `Client` con `onDelete: Cascade`, índice `@@index([clientId, createdAt])` y `@@map("contact_messages")`) y la relación inversa `contactMessages ContactMessage[]` en `Client`. Verificar que `npm run db:generate` compila sin errores de tipo.
- [x] 1.2 Crear la migración con `npm run db:migrate -- --name add_contact_messages` y verificar que se genera el archivo SQL con la tabla `contact_messages`, sus columnas y el índice.

## 2. Validaciones y sanitización

- [x] 2.1 Agregar en `lib/validations.ts` el schema zod `contactMessageSchema` (name obligatorio trim ≤120, email formato válido trim ≤254, phone obligatorio trim ≤40, message obligatorio trim ≤2000) y `contactMessageStatusSchema = z.enum(['new','read','resolved'])`. Verificar que el typecheck del proyecto no reporta errores y que el schema acepta/rechaza los casos límite probándolo con un script rápido.

## 3. API pública — POST de contacto

- [x] 3.1 Crear `app/api/public/[clientId]/contact-messages/route.ts` con `OPTIONS` (handleCors) y `POST`: extraer IP (x-forwarded-for → x-real-ip → 'unknown'), aplicar `rateLimit` de 5 mensajes / 10 min con identificador por IP (429 si supera), validar body con `contactMessageSchema` (400 con mensaje del primer error), verificar existencia del cliente (404), sanitizar name/message con `sanitizeText`, persistir con status "new" e ip. Verificar con curl que el POST devuelve `201 { id, status: "new", createdAt }` (ISO 8601) y responde `400`/`404`/`429` según el caso.
- [x] 3.2 Verificar con curl los límites y el contrato del endpoint: email inválido → 400, falta de `phone` → 400, campos extra ignorados y respuesta con solo `id`/`status`/`createdAt`, cliente inexistente → 404, y más de 5 envíos desde la misma IP → 429; confirmar cabeceras CORS en respuestas y preflight OPTIONS.

## 4. API dashboard — listado, estado, borrado y contador

- [x] 4.1 Crear `app/api/dashboard/contact-messages/route.ts` con `GET` (force-dynamic): `getServerSession` (401) → `getEffectiveClient` (401) → filtros `page`/`limit` (con tope) y opcional `status` → `where` con `clientId: effective.clientId` y `orderBy createdAt desc` → respuesta `{ messages, pagination }` con cada mensaje serializado (id, name, email, phone, message, status, ip, createdAt ISO). Verificar con curl autenticado que lista solo mensajes del cliente efectivo y que otros clientes no aparecen.
- [x] 4.2 Crear `app/api/dashboard/contact-messages/[id]/route.ts` con `PATCH` (valida `{ status }` con `contactMessageStatusSchema`, 400 si inválido) y `DELETE`, ambos con `getServerSession`/`getEffectiveClient` y `findFirst({ where: { id, clientId: effective.clientId } })` → 404 si no existe o es de otro cliente. Verificar con curl que cambia estado a new/read/resolved, elimina, y devuelve 400/404 en los casos de error y aislamiento entre dos clientes.
- [x] 4.3 Crear `app/api/dashboard/contact-messages/unread-count/route.ts` con `GET`: `getServerSession` (401) → `getEffectiveClient` (401) → `count({ where: { clientId: effective.clientId, status: 'new' } })` → respuesta `{ count }`. Verificar con curl que devuelve el número de `new` del cliente efectivo y `0` cuando no hay, y que baja tras marcar como leído.

## 5. UI — bandeja "Mensajes de contacto"

- [x] 5.1 Crear la página `app/dashboard/contact-messages/page.tsx` que consume el GET con paginación y filtro por estado, muestra los mensajes ordenados por fecha descendente con badge de estado y expande cada uno para ver message/email (enlace mailto:)/phone/ip. Verificar que carga datos reales del endpoint y pagina correctamente.
- [x] 5.2 Implementar las acciones de cambiar estado (new/read/resolved) y eliminar con confirmación llamando a los endpoints PATCH/DELETE, refrescando la lista tras cada acción. Verificar que el estado se refleja en el badge y que el borrado quita el mensaje de la lista.
- [x] 5.3 Agregar en `lib/menu-items.ts` la key `'contact-messages'` al union `MenuItemKey` y el item `Mensajes de contacto` (href `/dashboard/contact-messages`, section `Interactivos`, icono de sobre) con su import. Verificar que el ítem aparece en el menú del dashboard y respeta ocultamiento por plan/perfil.
- [x] 5.4 Agregar en `components/dashboard/Sidebar.tsx` el contador de pendientes: consultar `GET /api/dashboard/contact-messages/unread-count` y mostrar el número junto al ítem "Mensajes de contacto" cuando es mayor a 0, sin romper el menú si el fetch falla. Verificar que el badge aparece con mensajes `new` y desaparece al marcarlos como leídos.

## 6. Docs

- [x] 6.1 Agregar a `instruccionesapi.md` la fila en el índice y una sección para `POST /api/public/{clientId}/contact-messages` (body con name/email/phone/message, respuesta 201 `{ id, status, createdAt }`, errores 400/404/429), en el mismo formato de las secciones existentes. Verificar que el documento queda coherente con el índice.
- [x] 6.2 Agregar la entrada del endpoint a `/dashboard/api-test` (`app/dashboard/api-test/page.tsx`) siguiendo el patrón de los POST existentes, con su descripción y forma de probar. Verificar que aparece agrupada en la sección correspondiente y que una prueba real devuelve 201.
