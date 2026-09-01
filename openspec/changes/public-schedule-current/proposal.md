## Why

Los sitios web de cada radio/TV consumen la API pública (`/api/public/{clientId}`) para el reproductor, pero no existe ningún endpoint público que exponga la **parrilla horaria vigente** (qué playlist/programa está sonando "ahora" y cuáles vienen después). Ese dato solo vive en el agente de streaming y el panel lo expone únicamente protegido (`/api/dashboard/streaming/schedule/current`, `/api/dashboard/television/schedule/current`), inaccesible para el reproductor.

## What Changes

- **Agente de streaming**: `GET /api/streams/:clientId/schedule/current` (radio, en `routes/schedule.js`) y `GET /api/video/:clientId/schedule/current` (TV, en `routes/video-schedule.js`) pasan a devolver, además del slot actual, las siguientes 3 franjas activas ordenadas cronológicamente (cruzando días si hace falta) y la zona horaria del cliente. La lógica de "siguiente franja" vive en el agente (reutilizando `time.js`), no en el panel.
- **Panel — rutas públicas nuevas** (CORS `*`, sin autenticación, `Cache-Control: no-store`):
  - `GET /api/public/{clientId}/schedule/current` (radio)
  - `GET /api/public/{clientId}/tv/schedule/current` (TV)
  - Proxean al agente vía `streamingClient.getCurrentSchedule` / `videoClient.getCurrentSchedule`. Si el agente no responde, devuelven `502` (mismo patrón que `/api/dashboard`).
- **Docs**: actualizar `instruccionesapi.md` y la página `/dashboard/api-test` con los dos endpoints nuevos.

## Capabilities

### New Capabilities

- `public-api/schedule-current`: endpoints públicos de la API REST que exponen la parrilla horaria vigente de una radio/TV (slot actual + próximas franjas + zona horaria) para consumo desde el reproductor/sitio web de cada cliente.

### Modified Capabilities

- Ninguna: no hay spec previa de la API pública; el comportamiento nuevo queda contenido en la capacidad `public-api/schedule-current`.

## Impact

- **Agente** (`streaming/agent/routes/schedule.js`, `streaming/agent/routes/video-schedule.js`, posible helper en `streaming/agent/lib/time.js`): cálculo de franjas "siguientes" en `/schedule/current`.
- **Panel** (`app/api/public/[clientId]/schedule/current/route.ts`, `app/api/public/[clientId]/tv/schedule/current/route.ts`): rutas nuevas; reutilizan `lib/cors.ts` y `lib/streaming-client.ts` (sin cambios en el client salvo que se requiera pasar parámetro de límite).
- **Docs** (`instruccionesapi.md`, `app/dashboard/api-test/page.tsx`).
- **Deploy**: toca `streaming/agent/*` → tras el deploy hay que pulsar **"Actualizar nodo"** en cada nodo remoto (`/admin/servers`).
