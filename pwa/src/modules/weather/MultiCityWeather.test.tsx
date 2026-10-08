import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BasicLocation } from '@/core/types'
import { MultiCityWeather } from './MultiCityWeather'
import styles from './MultiCityWeather.module.css'

function weatherResponse(temperature: number, code = 0) {
  return new Response(
    JSON.stringify({ current_weather: { temperature, weathercode: code } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

const SANTIAGO: BasicLocation = {
  city: 'Santiago',
  country: 'CL',
  latitude: -33.4489,
  longitude: -70.6693
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MultiCityWeather', () => {
  it('muestra la tarjeta principal y las 9 ciudades fijas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(weatherResponse(20))))

    const { container } = render(<MultiCityWeather location={SANTIAGO} />)

    expect(screen.getByText('Santiago')).toBeInTheDocument()
    expect(container.querySelectorAll(`.${styles.mainCard}`)).toHaveLength(1)
    expect(container.querySelectorAll(`.${styles.cityCard}`)).toHaveLength(9)

    for (const name of [
      'Valparaíso',
      'Concepción',
      'Antofagasta',
      'La Serena',
      'Temuco',
      'Puerto Montt',
      'Punta Arenas',
      'Iquique',
      'Arica'
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }

    expect(await screen.findByText('20°C')).toBeInTheDocument()
  })

  it('muestra "Sin datos" en la ciudad que falla sin romper el resto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        String(url).includes('-33.047')
          ? Promise.reject(new Error('sin clima'))
          : Promise.resolve(weatherResponse(18, 1))
      )
    )

    render(<MultiCityWeather location={SANTIAGO} />)

    await waitFor(() => {
      const valparaiso = screen.getByText('Valparaíso').closest(`.${styles.cityCard}`)
      expect(valparaiso).toHaveTextContent('Sin datos')
    })

    await waitFor(() => {
      const arica = screen.getByText('Arica').closest(`.${styles.cityCard}`)
      expect(arica).toHaveTextContent('18°')
    })
  })

  it('omite la tarjeta principal sin ciudad pero conserva la grilla', () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))

    const { container } = render(<MultiCityWeather location={null} />)

    expect(container.querySelector(`.${styles.mainCard}`)).toBeNull()
    expect(container.querySelectorAll(`.${styles.cityCard}`)).toHaveLength(9)
  })
})
