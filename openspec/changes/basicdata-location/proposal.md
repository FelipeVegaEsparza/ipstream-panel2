## Why

Los sitios web de las radios (PWA) quieren mostrar el clima de la ciudad donde transmite la radio. Hoy el panel no guarda ni expone la ubicación de la radio, y los administradores no saben (ni deben) ingresar coordenadas a mano. Se necesita poder configurar la ciudad de cada radio con geocodificación automática (global, cualquier país) y exponerla por la API pública para que el frontend consulte un proveedor de clima (p. ej. Open-Meteo) con lat/lon.

## What Changes

- **Modelo `BasicData`** — se agregan columnas nullable `city`, `region`, `country` (ISO de 2 letras), `latitude`, `longitude`. Sin ciudad configurada quedan en `null`. Se aplica vía `prisma db push` en el deploy (sin migración manual).
- **Geocoder del panel (proxy)** — nuevo `GET /api/geocode?q=...` autenticado que consulta el geocoding global de Open-Meteo (server-side, `language=es`, mundial) y devuelve sugerencias tipadas `{ city, region, country, countryCode, latitude, longitude }`. El navegador nunca habla directo con el proveedor.
- **Formulario Datos Básicos (por cliente)** — nuevo control de ciudad con autocompletado (debounce) que permite elegir de la lista y guardar; incluye botón para quitar la ciudad (`location: null`).
- **Guardado** — el schema de validación acepta `location` anidado (`city` requerido si viene el objeto; `country` código ISO; lat/lon numéricos en rango). Al guardar se persiste mapeando `location` → columnas. Si el payload no trae `location`, no se pisan los valores previos; `location: null` explícito los limpia.
- **Exposición pública** — `getPublicBasicData` agrega `location` (`null` si no hay ciudad). Como `/basic-data` y el payload completo `/api/public/{clientId}` ya comparten ese ÚNICO serializer, la consistencia queda garantizada por construcción (lección del bug de `videoStreamingUrl`).
- **GET dashboard** — devuelve la ubicación con la misma forma anidada `location` para que edición y API pública no diverjan en estructura.

## Capabilities

### New Capabilities

- `radio-location`: ubicación geográfica de la radio — configuración de la ciudad desde el dashboard con geocodificación automática global (guardando `city`, `region`, `country` ISO, `latitude`, `longitude`) y exposición consistente de `location` en los endpoints públicos de datos básicos.

### Modified Capabilities

- Ninguna: no existe spec previa de ubicación; el comportamiento queda en la nueva capacidad `radio-location`.

## Impact

- `prisma/schema.prisma` — columnas de ubicación en `BasicData` (se sincronizan con `prisma db push` en el deploy).
- `lib/geocode.ts` (nuevo) — búsqueda de ciudades contra Open-Meteo Geocoding (server-side).
- `app/api/geocode/route.ts` (nuevo) — proxy autenticado de autocompletado.
- `lib/public-basic-data.ts` — `location` en la serialización pública compartida.
- `app/api/dashboard/basic-data/route.ts` — devuelve `location` anidado para el form.
- `lib/validations.ts` — `basicDataSchema` con `location` anidado opcional.
- `app/api/basic-data/route.ts` — mapea `location` → columnas al guardar.
- `components/dashboard/BasicDataForm.tsx` (+ componente de autocompletado) — selector de ciudad.
- Solo toca panel (app/lib/components + schema): no aplica "Actualizar nodo".
