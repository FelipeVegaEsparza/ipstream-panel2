## 1. Derivación de URLs por plan (lib/streaming-helpers.ts)

- [x] 1.1 Modificar `getClientStreamUrls()` en `lib/streaming-helpers.ts` para cargar `client.plan.services` (default `both`) y retornar `radioStreamingUrl = null` cuando el plan no incluya radio (`services === 'tv'`) o no exista `RadioStream`; y `videoStreamingUrl = null` cuando el plan no incluya TV (`services === 'radio'`) o no exista `VideoStream`. Verificar con `npx tsc --noEmit` que compila.
- [x] 1.2 Aplicar el mismo gate (plan + existencia de stream) en `rewriteClientPublicUrls()`, conservando los fallbacks a env solo cuando el servicio está habilitado. Verificar con `npx tsc --noEmit` y `npm run build`.

## 2. Contrato `services` en la API pública (basic-data)

- [x] 2.1 En `app/api/public/[clientId]/basic-data/route.ts`, resolver `services` del plan del cliente (default `both`, fail-open) e incluirlo en la respuesta JSON junto a las URLs derivadas. Verificar con `npx tsc --noEmit`.
- [x] 2.2 Verificar por API que `GET /api/public/{clientId}/basic-data` devuelve `services` correcto y URLs nulas/no-nulas según el plan (radio-only → `videoStreamingUrl: null`, `services: "radio"`; tv-only → `radioStreamingUrl: null`; both → ambas URLs).

## 3. Verificación integral

- [x] 3.1 Confirmar con un cliente que pasó de plan `both` a `radio` (con `VideoStream` aún existente) que `basic-data` devuelve `videoStreamingUrl: null` (downgrade cubierto por el gate de plan).
- [x] 3.2 Confirmar que el dashboard del cliente (rutas que consumen `getClientStreamUrls`, p. ej. datos básicos del dashboard) no muestra TV en clientes solo-radio.
- [x] 3.3 Confirmar que ningún cambio toca streaming-agent/scripts y ejecutar `npm run build` en limpio antes de commitear.
