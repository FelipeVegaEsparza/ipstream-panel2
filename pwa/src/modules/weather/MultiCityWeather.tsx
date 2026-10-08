import type { BasicLocation } from '@/core/types'
import { Section } from '@/ui'
import { sectionAnchorId } from '@/modules/content/sections'
import { weatherIcon, weatherLabel } from './label'
import { latValue, lonValue, useWeather } from './useWeather'
import styles from './MultiCityWeather.module.css'

/** Refresco del clima cada 10 minutos (el clima no cambia rápido). */
const REFRESH_MS = 10 * 60 * 1000

interface ChileCity {
  name: string
  latitude: number
  longitude: number
}

const CHILE_CITIES: ChileCity[] = [
  { name: 'Valparaíso', latitude: -33.047, longitude: -71.6196 },
  { name: 'Concepción', latitude: -36.8201, longitude: -73.044 },
  { name: 'Antofagasta', latitude: -23.6524, longitude: -70.3954 },
  { name: 'La Serena', latitude: -29.9027, longitude: -71.2519 },
  { name: 'Temuco', latitude: -38.7359, longitude: -72.5904 },
  { name: 'Puerto Montt', latitude: -41.4717, longitude: -72.9369 },
  { name: 'Punta Arenas', latitude: -53.1638, longitude: -70.9171 },
  { name: 'Iquique', latitude: -20.2307, longitude: -70.1357 },
  { name: 'Arica', latitude: -18.4784, longitude: -70.3226 }
]

function cityLocation(city: ChileCity): BasicLocation {
  return {
    city: city.name,
    country: 'CL',
    latitude: city.latitude,
    longitude: city.longitude
  }
}

function unitFor(country: string | null | undefined): string {
  return country === 'US' ? 'F' : 'C'
}

function WeatherIcon({ code, size }: { code: number | null | undefined; size: number }) {
  const Icon = weatherIcon(code)
  if (!Icon) {
    return (
      <span className={styles.iconPlaceholder} aria-hidden="true">
        —
      </span>
    )
  }
  return (
    <span className={styles.icon}>
      <Icon size={size} />
    </span>
  )
}

function MainCityCard({ location }: { location: BasicLocation }) {
  const weather = useWeather(location, { refreshIntervalMs: REFRESH_MS })
  const unit = unitFor(location.country)
  const label = weather ? weatherLabel(weather.code) : null
  const city = location.city || location.region || ''

  return (
    <div className={styles.mainCard}>
      <WeatherIcon code={weather?.code} size={40} />
      <span className={styles.mainCity}>{city}</span>
      <span className={styles.mainTemp}>
        {weather ? `${Math.round(weather.temperature)}°${unit}` : '--°'}
      </span>
      <span className={styles.mainDesc}>{label ?? 'Sin datos'}</span>
    </div>
  )
}

function CityWeatherCard({ city }: { city: ChileCity }) {
  const location = cityLocation(city)
  const weather = useWeather(location, { refreshIntervalMs: REFRESH_MS })
  const label = weather ? weatherLabel(weather.code) : null

  return (
    <div className={styles.cityCard}>
      <div className={styles.cityHeader}>
        <span className={styles.cityName}>{city.name}</span>
        <WeatherIcon code={weather?.code} size={20} />
      </div>
      <span className={styles.cityTemp}>
        {weather ? `${Math.round(weather.temperature)}°` : '--°'}
      </span>
      <span className={styles.cityDesc}>{label ?? 'Sin datos'}</span>
    </div>
  )
}

interface MultiCityWeatherProps {
  location: BasicLocation | null | undefined
}

export function MultiCityWeather({ location }: MultiCityWeatherProps) {
  const hasMain =
    Boolean(location?.city?.trim()) &&
    latValue(location) !== null &&
    lonValue(location) !== null

  return (
    <div id={sectionAnchorId('weather')} className={styles.wrap}>
      <Section title="Clima en Chile" bgText="CLIMA" visible>
        <div className={`${styles.layout} ${hasMain ? '' : styles.layoutNoMain}`}>
          {hasMain && location && <MainCityCard location={location} />}
          <div className={styles.cities}>
            {CHILE_CITIES.map((city) => (
              <CityWeatherCard key={city.name} city={city} />
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
