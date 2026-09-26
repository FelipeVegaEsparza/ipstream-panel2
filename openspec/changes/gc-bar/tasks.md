# Tasks

## 1. Modelo y migración

- [x] 1.1 Agregar el modelo `GcBarMessage` a `prisma/schema.prisma` (`clientId`, `text @db.Text`, `order`, timestamps, `@@index([clientId])`, `@@map("gc_bar_messages")`) y la relación `gcBarMessages GcBarMessage[]` en `Client`. Verificar que `npx prisma generate` corre sin errores.
- [x] 1.2 Crear la migración SQL `prisma/migrations/20260926_gc_bar_messages/migration.sql` con el `CREATE TABLE` y el índice. Verificar que `npx prisma validate` pasa.

## 2. Validación

- [x] 2.1 Agregar `gcBarMessageSchema` en `lib/validations.ts` (`text` string min 1, `order` entero opcional) y exportar su tipo. Verificar con `npx tsc --noEmit`.

## 3. Menú

- [x] 3.1 Agregar `'gc-bar'` al union `MenuItemKey` y un ítem en `MENU_ITEMS` con `section: 'Contenido'`, `name: 'Barra GC'`, `href: '/dashboard/gc-bar'` e ícono. Verificar que el ítem aparece en el grupo Contenido del dashboard con `npx tsc --noEmit`.

## 4. CRUD de panel

- [x] 4.1 Crear `app/api/gc-bar/route.ts` con `GET` (lista del cliente efectivo ordenada por `order` asc, `createdAt` asc) y `POST` (crea con `gcBarMessageSchema`), incluyendo el bloque `MENU_GUARD_INJECTED` para `gc-bar`. Verificar con `npx tsc --noEmit`.
- [x] 4.2 Crear `app/api/gc-bar/[id]/route.ts` con `GET`, `PUT` y `DELETE` filtrados por el `clientId` de la sesión y con el guard de menú. Verificar que las rutas responden `401/403` sin sesión/menú y operan sobre el cliente correcto.

## 5. API pública

- [x] 5.1 Crear `app/api/public/[clientId]/gc-bar/route.ts` con `OPTIONS` (CORS) y `GET` que devuelve los mensajes ordenados por `order` asc y `createdAt` asc, con `404` si el cliente no existe. Verificar con `curl` que un cliente existente responde `200` y un `clientId` inexistente responde `404`.
- [x] 5.2 Agregar la consulta de `gcBarMessage` al `Promise.all` de `app/api/public/[clientId]/route.ts` y la clave `gcBar` en la respuesta. Verificar que `GET /api/public/{clientId}` incluye `gcBar`.

## 6. UI del dashboard

- [x] 6.1 Crear `app/dashboard/gc-bar/page.tsx` (Server Component) con el guard de menú `gc-bar`, que obtiene los mensajes del cliente y los pasa al manager. Verificar que la ruta redirige al dashboard si el ítem está deshabilitado.
- [x] 6.2 Crear `components/dashboard/GcBarManager.tsx` ('use client') con listado (texto, orden), formulario inline para crear/editar (texto, orden) y eliminar con confirmación, llamando a `/api/gc-bar` y refrescando la lista. Verificar manualmente crear, editar, reordenar y eliminar.

## 7. Documentación

- [x] 7.1 Agregar el endpoint `GET /api/public/{clientId}/gc-bar` a la lista de `app/dashboard/api-test/page.tsx` y la clave `gcBar` a la descripción del payload agregado.
- [x] 7.2 Documentar el endpoint y la clave `gcBar` en `instruccionesapi.md` (tabla de endpoints, payload agregado y ejemplo), siguiendo el formato existente.

## 8. Verificación de integración

- [x] 8.1 Verificar el flujo completo: crear mensajes en `/dashboard/gc-bar`, confirmar que el endpoint público y `GET /api/public/{clientId}` devuelven los mensajes en el orden definido, y que al eliminar un mensaje desaparece de la API.
- [x] 8.2 Ejecutar `npm run build` sin errores y `openspec validate gc-bar --strict`.
