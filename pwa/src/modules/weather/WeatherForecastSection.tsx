import type { SectionDataProps } from '@/modules/content/format'
import { Section } from '@/ui'
import { CurrentWeatherCard } from './CurrentWeatherCard'
import { WeatherForecast } from './WeatherForecast'
import { useWeatherForecast } from './useWeather'

interface WeatherForecastSectionProps extends SectionDataProps {
  /** Muestra además una tarjeta con el clima actual (para templates sin clima en el header). */
  showCurrent?: boolean
}

export function WeatherForecastSection({
  clientData,
  showCurrent = false
}: WeatherForecastSectionProps) {
  const location = clientData?.basicData?.location
  const city = location?.city?.trim() ?? ''
  const hasCity = city.length > 0
  const { days, loading } = useWeatherForecast(location)

  return (
    <Section
      title={`Proyección del clima en ${city}`}
      visible={hasCity && days.length > 0}
      loading={hasCity && loading && days.length === 0}
    >
      {showCurrent && <CurrentWeatherCard location={location} />}
      <WeatherForecast days={days} country={location?.country} />
    </Section>
  )
}
