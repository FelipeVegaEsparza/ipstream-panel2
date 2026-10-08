import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseForecast, useWeatherForecast } from './useWeather'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseForecast', () => {
  it('convierte las listas diarias en días', () => {
    const days = parseForecast({
      daily: {
        time: ['2026-01-01', '2026-01-02'],
        weather_code: [0, 3],
        temperature_2m_max: [20, 18],
        temperature_2m_min: [10, 9]
      }
    })

    expect(days).toEqual([
      { date: '2026-01-01', code: 0, max: 20, min: 10 },
      { date: '2026-01-02', code: 3, max: 18, min: 9 }
    ])
  })

  it('acepta la variante weathercode y descarta días incompletos', () => {
    const days = parseForecast({
      daily: {
        time: ['2026-01-01', '2026-01-02'],
        weathercode: [1, 2],
        temperature_2m_max: [20, null],
        temperature_2m_min: [10, 9]
      }
    })

    expect(days).toHaveLength(1)
    expect(days[0]).toEqual({ date: '2026-01-01', code: 1, max: 20, min: 10 })
  })

  it('sin daily devuelve vacío', () => {
    expect(parseForecast({})).toEqual([])
  })
})

describe('useWeatherForecast', () => {
  it('no consulta sin coordenadas', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useWeatherForecast({ city: 'Santiago', country: 'CL' })
    )

    expect(result.current.days).toEqual([])
    expect(result.current.loading).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('carga los días cuando hay coordenadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        daily: {
          time: ['2026-01-01', '2026-01-02', '2026-01-03'],
          weather_code: [0, 3, 61],
          temperature_2m_max: [20, 18, 15],
          temperature_2m_min: [10, 9, 8]
        }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useWeatherForecast({
        latitude: -33.45,
        longitude: -70.66,
        country: 'CL'
      })
    )

    await waitFor(() => expect(result.current.days).toHaveLength(3))
    expect(result.current.loading).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('daily=weather_code')
    expect(url).toContain('temperature_unit=celsius')
  })

  it('devuelve vacío si la consulta falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))

    const { result } = renderHook(() =>
      useWeatherForecast({ latitude: -33.45, longitude: -70.66, country: 'CL' })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.days).toEqual([])
  })
})
