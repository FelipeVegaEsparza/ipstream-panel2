# Tasks

## 1. Contrato de mensajes y permisos backend

- [x] 1.1 Corregir `GET /api/public/[clientId]/chat/messages` para devolver los últimos N mensajes ascendentes sin `since` y mensajes posteriores al cursor con `nextCursor`/`hasMore` cuando exista `since`; verificar con tests de rutas mockeando Prisma.
- [x] 1.2 Agregar `chatEnabled` al agregado público usando `isMenuItemEnabled` y bloquear las rutas públicas de chat cuando esté deshabilitado; verificar con tests de permiso.
- [x] 1.3 Corregir `GET /api/dashboard/chat/messages` para soportar `since` y devolver `nextCursor`/`hasMore`, manteniendo paginación/búsqueda sin cursor; verificar con tests de rutas.
- [x] 1.4 Agregar el guard `chat` a la página y APIs del dashboard de mensajes, bans y stats; verificar que una petición sin permiso responda bloqueada.
- [x] 1.5 Excluir al staff del conteo de oyentes activos en `/chat/online` y en `getChatStats`; verificar con tests de conteo.

## 2. Cliente PWA del chat

- [x] 2.1 Actualizar `ChatMessagesResponse`/`ChatAuthorType` y `sendChatMessage` para `staff`, `nextCursor`, `hasMore` y el mensaje único que devuelve el POST.
- [x] 2.2 Corregir `ChatSection` para usar `nextCursor`, drenar tandas con `hasMore`, validar email obligatorio, persistir nombre y mostrar errores reales; verificar con tests de la PWA.
- [x] 2.3 Ajustar el estilo/render de mensajes de staff y el contador de oyentes; verificar con tests de `ChatSection`.

## 3. Integración del chat en la PWA

- [x] 3.1 Agregar `chatEnabled` a `FullClientData` y al agregado público; verificar typecheck.
- [x] 3.2 Agregar la sección `chat` a `sections.ts` (id, label, orden por template y `sectionHasContent`), al switch de `ContentSections` y al icono de blue; verificar que aparezca solo con `chatEnabled`.
- [x] 3.3 Crear el widget flotante en `App.tsx` (o componente dedicado) que abra `ChatSection` en modo embedded, se oculte en homes con sección y aparezca en minimalista y páginas internas; verificar con build de PWA.
- [x] 3.4 Agregar estilos responsivos del widget/panel y del modo embedded; verificar visualmente en desarrollo.

## 4. Operación y documentación

- [x] 4.1 Crear `deploy/scripts/cron-chat.sh` protegido por `CRON_SECRET` para ejecutar `/api/cron/chat/cleanup` y documentar el crontab horario.
- [x] 4.2 Corregir el README sobre `CRON_SECRET` y la retención del chat; verificar que coincida con el código.

## 5. Verificación de integración

- [x] 5.1 Ejecutar `npx tsc --noEmit`, `npm test` y `npm run build`; corregir errores.
- [x] 5.2 Ejecutar `cd pwa && npm run test` y `cd pwa && npm run build`; corregir errores.
- [x] 5.3 Verificar en pruebas que el home muestra la sección, las páginas internas el widget, minimalista el widget y que un chat deshabilitado no aparece ni responde.
- [x] 5.4 Confirmar que no se modifican archivos del agente de streaming ni se requiere “Actualizar nodo”.
