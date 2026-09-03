## 1. Modelo de datos

- [x] 1.1 Agregar en `prisma/schema.prisma` al modelo `BasicData` las columnas `city String?`, `region String?`, `country String?`, `latitude Float?`, `longitude Float?`. Verificar que `npx tsc --noEmit` y `prisma validate` pasan.

## 2. Geocoder del panel

- [x] 2.1 Crear `lib/geocode.ts` con `GeocodeResult` y `searchCity(query)` que consulta Open-Meteo Geocoding server-side (`name`, `count=8`, `language=es`) y mapea a `{ id, city, region, country, countryCode, latitude, longitude }`. Verificar la respuesta de Open-Meteo con un request de prueba (p. ej. `curl` a la API) y que `tsc` compila.
- [x] 2.2 Crear `GET /api/geocode?q=...` autenticado (sesión del panel) que devuelve las sugerencias. Verificar con `npx tsc --noEmit` y probando la ruta localmente con una ciudad global (p. ej. Tokio y Osorno) para confirmar que responde de cualquier país.

## 3. Formulario y guardado

- [x] 3.1 Extender `basicDataSchema` en `lib/validations.ts` con `location` anidado opcional (si el objeto existe: `city` requerido, `country` ISO-2, lat ∈ [-90,90], lon ∈ [-180,180]; admite `null`). Verificar con `npx tsc --noEmit`.
- [x] 3.2 Mapear `location` → columnas en `app/api/basic-data` (PUT/POST): si el payload no trae la key `location`, conservar lo previo; si trae `null`, limpiar; si trae objeto, persistir. Verificar con `npx tsc --noEmit`.
- [x] 3.3 En `app/api/dashboard/basic-data` (GET), devolver `location` anidado construido desde las columnas. Verificar con `npx tsc --noEmit`.
- [x] 3.4 Agregar el control de ciudad (autocompletado con debounce contra `/api/geocode`, mostrar sugerencia "ciudad, región, país", chip con quitar) en `components/dashboard/BasicDataForm.tsx`, cargando el valor inicial desde `location`. Verificar con `npx tsc --noEmit` y `npm run build`.

## 4. Exposición pública y verificación integral

- [x] 4.1 Incluir `location` en `lib/public-basic-data.ts` (mismo objeto anidado que el GET dashboard; `null` si no hay ciudad). Verificar con `npx tsc --noEmit`.
- [ ] 4.2 Verificar en API pública que un cliente con ciudad configurada devuelve el mismo `location` en `/api/public/{clientId}/basic-data` y en `/api/public/{clientId}`; y que un cliente sin configurar devuelve `location: null` en ambos.
- [ ] 4.3 Configurar al menos una ciudad de otro continente (ej. Tokio, JP) en un cliente de prueba y confirmar guardado + exposición correcta (autocompletado global).
- [x] 4.4 Confirmar que ningún cambio toca streaming-agent/scripts y ejecutar `npm run build` en limpio antes de commitear.
