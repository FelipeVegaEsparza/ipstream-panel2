## Why

Hoy no existe una forma de que cada radio/TV publique una "Barra GC": una lista de mensajes o frases cortas (tipo cintillo/ticker) que su sitio consuma desde la API pública. El contenido editable actual (noticias, promociones, auspiciadores, etc.) no cubre este caso, por lo que las frases se administran por fuera del panel y no se exponen por la API.

## What Changes

- **Nueva sección "Barra GC" dentro del grupo Contenido** del dashboard, en `/dashboard/gc-bar`, donde el cliente agrega, edita, ordena y elimina mensajes/frases.
- **Modelo nuevo `GcBarMessage`** (tabla `gc_bar_messages`): `clientId`, `text`, `order`, timestamps; relación con `Client`.
- **CRUD de panel nuevo**: `GET/POST /api/gc-bar` y `GET/PUT/DELETE /api/gc-bar/[id]`, aislados por el cliente efectivo y con el guard de menú (`gc-bar`), siguiendo el patrón de `announcers`/`promotions`.
- **Endpoint público nuevo**: `GET /api/public/{clientId}/gc-bar` (CORS `*`, sin auth) que devuelve los mensajes de ese cliente ordenados por `order` ascendente.
- **Payload agregado**: se agrega la clave `gcBar` a `GET /api/public/{clientId}` con los mensajes, igual que el resto del contenido.
- **Menú y permisos**: se agrega el ítem `gc-bar` al `MenuItemKey`, al grupo `Contenido` y a `MENU_ITEMS`, por lo que queda sujeto a los permisos de menú/plan existentes sin lógica extra.
- **Documentación**: se actualiza `app/dashboard/api-test/page.tsx` (endpoint nuevo) e `instruccionesapi.md` (tabla de endpoints, payload agregado y ejemplo).

## Capabilities

### New Capabilities

- `gc-bar`: gestión de mensajes/frases de la Barra GC por cliente y su exposición pública vía API.

### Modified Capabilities

- Ninguna.

## Impact

- **Prisma**: nueva tabla `gc_bar_messages` y relación `Client.gcBarMessages`; migración SQL nueva. El deploy aplica la tabla con `prisma db push` (entrypoint).
- **Menú**: `lib/menu-items.ts` (nuevo `MenuItemKey` `gc-bar`, ítem en `Contenido`).
- **API panel**: nuevas rutas `app/api/gc-bar/route.ts` y `app/api/gc-bar/[id]/route.ts` (con `MENU_GUARD_INJECTED`).
- **API pública**: nueva ruta `app/api/public/[clientId]/gc-bar/route.ts` y cambio en `app/api/public/[clientId]/route.ts`.
- **Validaciones**: nuevo `gcBarMessageSchema` en `lib/validations.ts`.
- **UI dashboard**: nueva página `app/dashboard/gc-bar/page.tsx` + componentes de gestión (lista + formulario con texto, activo y orden).
- **Docs**: `app/dashboard/api-test/page.tsx` e `instruccionesapi.md`.
- **Config**: sin variables de entorno nuevas. Cambio solo de panel: no toca streaming-agent, por lo que no requiere "Actualizar nodo".
