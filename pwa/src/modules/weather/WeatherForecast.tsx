import { weatherIcon, weatherLabel } from './label'
import type { WeatherForecastDay } from './useWeather'
import styles from './WeatherForecast.module.css'

const WEEKDAY = new Intl.DateTimeFormat('es-CL', { weekday: 'short' })

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Hoy'
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  const label = WEEKDAY.format(parsed).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface WeatherForecastProps {
  days: WeatherForecastDay[]
  country?: string | null
}

export function WeatherForecast({ days, country }: WeatherForecastProps) {
  if (days.length === 0) return null
  const unit = country === 'US' ? 'F' : 'C'

  return (
    <ul className={styles.list}>
      {days.map((day, index) => {
        const Icon = weatherIcon(day.code)
        const label = weatherLabel(day.code)
        return (
          <li key={day.date} className={styles.day} title={label ?? undefined}>
            <span className={styles.name}>{dayLabel(day.date, index)}</span>
            <span className={styles.icon} aria-hidden="true">
              {Icon && <Icon size={18} />}
            </span>
            <span className={styles.temps}>
              <b className={styles.max}>
                {Math.round(day.max)}°{unit}
              </b>
              <span className={styles.min}>
                {Math.round(day.min)}°
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
