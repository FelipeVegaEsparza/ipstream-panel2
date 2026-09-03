## Context

Ver proposal.md (Why) y spec. Estado relevante:

- `BasicData` (tabla `basic_data`) hoy no guarda ubicación; es 1:1 con `Client`.
- La serialización pública ya es única: `lib/public-basic-data.ts` (usado por `/basic-data` y por el payload completo `/api/public/{clientId}`). Ese es el lugar donde `location` nunca puede divergir.
- El guardado de datos básicos vive en `app/api/basic-data` (PUT/POST por cliente, validado con `basicDataSchema`) y el GET para el form en `app/api/dashboard/basic-data`.
- El deploy sincroniza el schema con `prisma db push` (`deploy/scripts/deploy.sh` y `docker-entrypoint.sh`), por lo que agregar columnas no requiere migración manual.

## Goals / Non-Goals

**Goals:**
- Configurar la ciudad de la radio desde Datos Básicos con autocompletado global (cualquier país).
- Resolver las coordenadas en el panel (no en el navegador, ni manualmente por el admin).
- Exponer `location` idéntico en ambos endpoints públicos, sin volver a divergir.
- Dejar la integración de clima 100% del lado del frontend/sitio (el panel solo guarda y expone lat/lon).

**Non-Goals:**
- No integrar un proveedor de clima en el panel.
- No permitir edición manual de coordenadas (la resolución la hace el geocoder).
- No geocodificar en cada guardado (A3 descartado): las coordenadas viajan con la sugerencia elegida; re-geocodificar cada save es más lento y ambiguo con nombres duplicados.

## Decisions

### 1. Geocoder del panel como proxy (A2)

Nueva ruta autenticada `GET /api/geocode?q=...` que consulta server-side el **Open-Meteo Geocoding API** y devuelve sugerencias tipadas:

```ts
// lib/geocode.ts
export interface GeocodeResult {
  id: number
  city: string        // name
  region: string | null // admin1 (estado/provincia/región)
  country: string     // country (nombre largo, para mostrar)
  countryCode: string // country_code ISO-2 (para guardar)
  latitude: number
  longitude: number
}
export async function searchCity(query: string): Promise<GeocodeResult[]>
// GET https://geocoding-api.open-meteo.com/v1/search
//   ?name=<q>&count=8&language=es&format=json
```

- Por qué A2 y no browser-direct (A1): el backend resuelve ("el panel resuelve las coordenadas"), el proveedor queda oculto/centralizado en un solo módulo, no dependemos del CORS del tercero y es trivial cambiar a Nominatim después.
- Por qué no A3 (resolver al guardar): la sugerencia ya trae coordenadas exactas; re-geocodificar agrega latencia y ambigüedad por ciudades homónimas.
- `language=es`: los nombres de ciudad/región se muestran en español (panel en español); asumido y registrado.

### 2. Modelo: columnas escalares nullable

Agregar a `BasicData`: `city String?`, `region String?`, `country String?` (ISO-2), `latitude Float?`, `longitude Float?`.

- Por qué columnas y no JSON: consulta/serialización simples y consistentes con el resto del modelo; un JSON habría exigido parseos por cada read.

### 3. Forma canónica `location` (anidada) en payloads y respuestas

- **Guardado** (`app/api/basic-data`): `basicDataSchema` acepta `location` opcional (`city` requerido si el objeto existe; `country` `.length(2)`/regex ISO; lat ∈ [-90,90], lon ∈ [-180,180]). Antes del upsert se mapea `location` → columnas. Reglas de no-pisado: si el payload NO trae la key `location`, se conserva lo previo; si trae `null`, se limpia.
- **GET dashboard** (`app/api/dashboard/basic-data`): devuelve el objeto con `location` anidado (transformando las columnas) para que el form y la API pública usen la misma forma.
- **GET público**: `getPublicBasicData` incluye `location` construido desde las columnas (o `null`).

### 4. Autocompletado en el formulario

Componente cliente (dentro de `BasicDataForm`): input con debounce (~300ms) → `GET /api/geocode?q=`; lista de sugerencias "city, region, country"; al elegir se setea `location` en el estado del form y se muestra como chip con botón quitar. Requiere sesión (misma que el resto del dashboard).

## Risks / Trade-offs

- [Dependencia de disponibilidad de Open-Meteo para el autocompletado] → Fallo degradado: si el geocoder no responde, el campo muestra error de búsqueda pero no rompe el guardado de otros datos. Módulo `lib/geocode.ts` aislado para poder cambiarlo de proveedor.
- [Nombres localizados (`language=es`)] → Asumido: el panel es en español. Si se requiere el nombre local oficial, cambiar el parámetro de idioma en `lib/geocode.ts`.
- [Lat/lon provienen de la sugerencia (no se re-geocodifican al guardar)] → Riesgo bajo: la resolución ocurrió en el backend al buscar; se valida formato/rango al persistir.
- [db push con `--accept-data-loss` en cada deploy] → Ya es el mecanismo existente del proyecto; agregar columnas nullable es seguro.

## Migration Plan

- Sin migración manual: se agregan columnas a `schema.prisma` y el deploy las aplica con `prisma db push`.
- Rollback: revertir el commit (columnas extra nullable son inofensivas si quedan).
- Verificación post-deploy: configurar ciudad en un cliente (incluida una ciudad de otro continente) → guardar → confirmar `location` idéntico en `/basic-data` y `/api/public/{clientId}`; cliente sin ciudad → `location: null` en ambos.
- No aplica "Actualizar nodo" (no toca streaming-agent/scripts).
