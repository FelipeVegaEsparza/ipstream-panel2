import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeatherForecast } from './WeatherForecast'
import type { WeatherForecastDay } from './useWeather'

const DAYS: WeatherForecastDay[] = [
  { date: '2026-09-17', code: 0, max: 20, min: 10 },
  { date: '2026-09-18', code: 3, max: 18.4, min: 9.2 }
]

describe('WeatherForecast', () => {
  it('muestra los días con la primera como "Hoy" y las temperaturas', () => {
    render(<WeatherForecast days={DAYS} country="CL" />)

    expect(screen.getByText('Hoy')).toBeInTheDocument()
    expect(screen.getByText('20°C')).toBeInTheDocument()
    expect(screen.getByText('10°')).toBeInTheDocument()
    expect(screen.getByText('18°C')).toBeInTheDocument()
  })

  it('usa Fahrenheit cuando el país es US', () => {
    render(<WeatherForecast days={[DAYS[0]!]} country="US" />)
    expect(screen.getByText('20°F')).toBeInTheDocument()
  })

  it('no renderiza nada sin días', () => {
    const { container } = render(<WeatherForecast days={[]} country="CL" />)
    expect(container.firstChild).toBeNull()
  })
})
