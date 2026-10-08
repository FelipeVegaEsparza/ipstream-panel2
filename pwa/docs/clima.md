# Clima y pronóstico por radio

Cómo se muestra el clima de la ciudad configurada de cada radio.

## Fuente de datos

Se usa [Open-Meteo](https://open-meteo.com) (público, sin API key) con las
coordenadas de `basicData.location` (la ciudad que se configura en el panel).

- **Clima actual**: `current_weather=true` → temperatura y condición.
- **Pronóstico**: `daily=weather_code,temperature_2m_max,temperature_2m_min`
  con `timezone=auto&forecast_days=7` → 7 días.

Unidades: °C por defecto, °F cuando `location.country` es `US`.

No hay geocoding: la ciudad y las coordenadas vienen en la API del panel.

## Dónde se muestra

- **Clima actual** (`Weather`): en los templates que lo incluyen (por ejemplo,
  la franja lateral de `covered`).
- **Pronóstico** (`WeatherForecast`): como sección **"Proyección del clima en
  {ciudad}"** dentro del stack de contenido, por lo que aparece en todos los
  templates en la posición definida por el orden de secciones de cada uno.
- **Clima multi-ciudad** (`MultiCityWeather`): solo en el template `moderno2`.
  Muestra una tarjeta principal con la ciudad del panel (`basicData.location`)
  más una grilla fija con las 9 ciudades de Chile (Valparaíso, Concepción,
  Antofagasta, La Serena, Temuco, Puerto Montt, Punta Arenas, Iquique, Arica).
  Cada tarjeta consulta el proveedor por su cuenta (un fallo no afecta al
  resto) y el conjunto se refresca cada 10 minutos. Si el cliente no tiene
  ciudad configurada, la tarjeta principal se omite y la grilla sigue visible.

## Sección "Proyección del clima en {ciudad}"

- Se agrega al catálogo de secciones (`sections.ts`) con el id `weather`.
- El título usa la ciudad configurada en `basicData.location.city`.
- `sectionHasContent` la considera visible solo si `basicData.location` tiene
  ciudad (no vacía), `latitude` y `longitude`. Sin ciudad no se muestra, aunque
  haya coordenadas.
- Mientras carga muestra un skeleton; si el proveedor falla, la sección no se
  muestra (degradación elegante).
- La tira de días tiene scroll horizontal en móvil; el primer día se rotula
  "Hoy".

## Condiciones (códigos WMO)

Los códigos del proveedor se traducen con `weatherLabel` y se representan con
iconos (`weatherIcon`) en `src/modules/weather/label.ts`.

## Archivos involucrados

- `src/modules/weather/useWeather.ts` — clima actual y `useWeatherForecast`.
- `src/modules/weather/Weather.tsx` — clima actual.
- `src/modules/weather/WeatherForecast.tsx` — tira de pronóstico.
- `src/modules/weather/WeatherForecastSection.tsx` — sección para el stack.
- `src/modules/weather/MultiCityWeather.tsx` — vista multi-ciudad de `moderno2`.
- `src/modules/content/sections.ts` / `ContentSections.tsx` — integración.
