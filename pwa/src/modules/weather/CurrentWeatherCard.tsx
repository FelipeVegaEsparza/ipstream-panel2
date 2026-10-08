import { FaLocationDot } from 'react-icons/fa6'
import type { BasicLocation } from '@/core/types'
import { weatherIcon, weatherLabel } from './label'
import { useWeather } from './useWeather'
import styles from './CurrentWeatherCard.module.css'

interface CurrentWeatherCardProps {
  location: BasicLocation | null | undefined
}

/** Tarjeta con el clima actual de la ciudad configurada. */
export function CurrentWeatherCard({ location }: CurrentWeatherCardProps) {
  const weather = useWeather(location)
  if (!weather) return null

  const unit = location?.country === 'US' ? 'F' : 'C'
  const city = location?.city || location?.region || ''
  const label = weatherLabel(weather.code)
  const Icon = weatherIcon(weather.code)

  return (
    <div className={styles.card}>
      {Icon && (
        <span className={styles.icon}>
          <Icon size={28} />
        </span>
      )}
      <div className={styles.main}>
        <span className={styles.temp}>
          {Math.round(weather.temperature)}°{unit}
        </span>
        {label && <span className={styles.cond}>{label}</span>}
      </div>
      {city && (
        <span className={styles.city}>
          <FaLocationDot size={12} />
          {city}
        </span>
      )}
    </div>
  )
}
