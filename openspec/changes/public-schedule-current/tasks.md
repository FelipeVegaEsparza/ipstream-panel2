## 1. Agente de streaming — helper de franjas siguientes

- [x] 1.1 Agregar en `streaming/agent/lib/time.js` un helper `getNextSlots(slots, now, timeZone, limit)` que ordena las franjas activas por proximidad cronológica al momento actual (cruzando días de la semana y medianoche) y devuelve hasta `limit` franjas posteriores. Verificar con un caso simple (franjas del mismo día) y uno que cruza días (ej. jueves 23:00, siguiente franja el viernes 08:00).

## 2. Agente de streaming — extender /schedule/current de radio y TV

- [x] 2.1 En `streaming/agent/routes/schedule.js`, extender `GET /api/streams/:clientId/schedule/current` para devolver `{ current, upcoming, timezone }` usando `getNextSlots` (mantener `current` con el formato actual). Verificar que la respuesta incluye los 3 campos nuevos y que `current` no cambia su forma.
- [x] 2.2 En `streaming/agent/routes/video-schedule.js`, extender `GET /api/video/:clientId/schedule/current` de forma equivalente. Verificar la misma respuesta de 3 campos para TV.
- [x] 2.3 Verificar con un cliente con franjas que cruzan medianoche y con un cliente sin franjas (debe responder `current: null` + `upcoming: []`) usando curl contra el agente con Bearer token.

## 3. Panel — rutas públicas

- [x] 3.1 Crear `app/api/public/[clientId]/schedule/current/route.ts` (radio): `OPTIONS` + CORS, verificar cliente (404), `dynamic='force-dynamic'`, `Cache-Control: no-store`, llamar `streamingClient.getCurrentSchedule(clientId)`, y devolver `502` con CORS si el agente falla (`StreamingAgentError`). Verificar con curl el 200, el 404 de cliente inexistente y el 502 simulando agente caído.
- [x] 3.2 Crear `app/api/public/[clientId]/tv/schedule/current/route.ts` (TV) con el mismo patrón usando `videoClient.getCurrentSchedule`. Verificar con curl contra el panel (radio y TV).

## 4. Docs

- [x] 4.1 Agregar los dos endpoints a `instruccionesapi.md` (sección nueva o ampliar índice) con su forma de respuesta. Verificar que el documento queda coherente con el índice de endpoints.
- [x] 4.2 Agregar los dos endpoints a la página `/dashboard/api-test` (`app/dashboard/api-test/page.tsx`) con su descripción. Verificar que aparecen agrupados en la sección correspondiente.
