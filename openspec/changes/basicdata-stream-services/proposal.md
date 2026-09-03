## Why

Cada plan define qué servicios incluye (`services`: `radio` | `tv` | `both`), pero el reproductor/sitio público de cada cliente decide qué mostrar leyendo **solo** las URLs de `basic-data` (`radioStreamingUrl` / `videoStreamingUrl`). Esas URLs se derivan con `getClientStreamUrls()`, y hoy `videoStreamingUrl` se calcula a partir del servidor de video **sin verificar que el cliente tenga un `VideoStream` ni que su plan incluya TV**. Un cliente con plan solo-radio recibe una URL HLS que no existe, por lo que el reproductor muestra la sección TV igualmente. Además, no se expone ningún campo que indique el contrato del plan (radio/tv/both) para que el reproductor decida por contrato.

## What Changes

- **Corregir la derivación de URLs** — `getClientStreamUrls()` (y su persistencia equivalente en `rewriteClientPublicUrls`) retorna `null` para el servicio que el cliente **no tiene activo**: si el plan no incluye TV (o no hay `VideoStream`) → `videoStreamingUrl = null`; si el plan no incluye radio (o no hay `RadioStream`) → `radioStreamingUrl = null`. Simétrico a como radio ya exigía el stream. Esto corta el síntoma sin tocar el reproductor.
- **Exponer el contrato del plan en la API pública** — la respuesta de `GET /api/public/{clientId}/basic-data` agrega `services` (`radio` | `tv` | `both`) derivado del plan del cliente (default `both` si no tiene plan, fail-open igual que el panel), para que el reproductor pueda decidir secciones por contrato en el futuro.
- No cambia el esquema de BD ni la semántica de `Plan.services`; el plan sigue siendo la fuente de verdad (igual que usa el menú del panel).

## Capabilities

### New Capabilities

- `public-api/basic-data-services`: la API pública de datos básicos expresa qué servicios (radio/TV) incluye el cliente — tanto por el valor explícito `services` como por la nulabilidad de `radioStreamingUrl`/`videoStreamingUrl`, que solo son no-null cuando el servicio está realmente habilitado.

### Modified Capabilities

- Ninguna: no existe spec previa que gobierne la derivación de URLs públicas de streaming ni el contrato de servicios en `basic-data`.

## Impact

- `lib/streaming-helpers.ts` — `getClientStreamUrls()` consulta `client.plan.services` y nullea la URL del servicio no incluido; `rewriteClientPublicUrls()` aplica la misma regla al persistir.
- `app/api/public/[clientId]/basic-data/route.ts` — expone `services` en la respuesta (consume el helper).
- `app/api/dashboard/basic-data/route.ts` — consume el mismo helper corregido (las URLs del dashboard dejan de mostrar TV/radio inexistentes).
- Solo toca panel (app/lib): no aplica "Actualizar nodo" tras el deploy.
