import { useEffect, useState } from 'react'
import type { BasicLocation } from '@/core/types'

interface WeatherData {
  temperature: number
  code: number | null
}

const FETCH_TIMEOUT_MS = 12000

// Solo un número real y finito dentro del rango válido cuenta como coordenada:
// null/undefined/''/NaN o fuera de rango devuelven null ("sin coordenadas").
export function latValue(location: BasicLocation | null | undefined): number | null {
  const lat = location?.latitude
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return null
  }
  return lat
}

export function lonValue(location: BasicLocation | null | undefined): number | null {
  const lon = location?.longitude
  if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return null
  }
  return lon
}

export interface UseWeatherOptions {
  /** Refresca el clima cada N ms (0 = sin refresco periódico). */
  refreshIntervalMs?: number
}

export function useWeather(
  location: BasicLocation | null | undefined,
  options: UseWeatherOptions = {}
) {
  const [data, setData] = useState<WeatherData | null>(null)

  const lat = latValue(location)
  const lon = lonValue(location)
  const hasCoords = Boolean(location) && lat !== null && lon !== null
  const country = location?.country
  const refreshIntervalMs = options.refreshIntervalMs ?? 0

  useEffect(() => {
    // Sin coordenadas válidas se trata igual que sin ubicación:
    // datos en null y ningún fetch (evita consultar (0,0) en mar abierto).
    if (!hasCoords || lat === null || lon === null) {
      setData(null)
      return
    }

    const unit = country === 'US' ? 'fahrenheit' : 'celsius'
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true&temperature_unit=${unit}`

    let active = true
    let controller: AbortController | null = null
    let timer: number | undefined

    const attempt = () => {
      if (!active) return
      if (controller) controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)

      const next = new AbortController()
      controller = next
      timer = window.setTimeout(() => next.abort(), FETCH_TIMEOUT_MS)

      fetch(url, { signal: next.signal })
        .then((res) =>
          res.ok ? res.json() : Promise.reject(new Error(String(res.status)))
        )
        .then((json) => {
          if (!active) return
          const current = json?.current_weather
          if (current && typeof current.temperature === 'number') {
            setData({
              temperature: current.temperature,
              code: typeof current.weathercode === 'number' ? current.weathercode : null
            })
          } else {
            setData(null)
          }
        })
        .catch(() => {
          // Fallo de red o timeout: se reintenta solo al volver online
          // o al volver visible la pestaña (ver listeners abajo).
        })
    }

    const handleOnline = () => attempt()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') attempt()
    }

    attempt()

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    const intervalId =
      refreshIntervalMs > 0
        ? window.setInterval(attempt, refreshIntervalMs)
        : undefined

    return () => {
      active = false
      if (controller) controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)
      if (intervalId !== undefined) window.clearInterval(intervalId)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [hasCoords, lat, lon, country, refreshIntervalMs])

  return data
}

export interface WeatherForecastDay {
  date: string
  code: number | null
  max: number
  min: number
}

export interface WeatherForecastState {
  days: WeatherForecastDay[]
  loading: boolean
}

const FORECAST_DAYS = 7

/** Convierte la respuesta `daily` de Open-Meteo en una lista de días válidos. */
export function parseForecast(json: unknown): WeatherForecastDay[] {
  const daily = (json as { daily?: Record<string, unknown> } | null)?.daily
  if (!daily || !Array.isArray(daily.time)) return []

  const times = daily.time as unknown[]
  // El nombre de la variable cambió entre versiones del proveedor.
  const codes = (daily.weather_code ?? daily.weathercode) as unknown[] | undefined
  const maxes = daily.temperature_2m_max as unknown[] | undefined
  const mins = daily.temperature_2m_min as unknown[] | undefined

  const days: WeatherForecastDay[] = []
  for (let index = 0; index < times.length; index += 1) {
    const max = maxes?.[index]
    const min = mins?.[index]
    if (typeof max !== 'number' || typeof min !== 'number') continue
    days.push({
      date: String(times[index]),
      code: typeof codes?.[index] === 'number' ? (codes[index] as number) : null,
      max,
      min
    })
  }
  return days
}

/**
 * Pronóstico diario de la ciudad configurada. Sin coordenadas no consulta; ante
 * fallo de red devuelve una lista vacía (la sección se oculta).
 */
export function useWeatherForecast(
  location: BasicLocation | null | undefined
): WeatherForecastState {
  const [state, setState] = useState<WeatherForecastState>({
    days: [],
    loading: false
  })

  const lat = latValue(location)
  const lon = lonValue(location)
  const hasCoords = Boolean(location) && lat !== null && lon !== null
  const country = location?.country

  useEffect(() => {
    if (!hasCoords || lat === null || lon === null) {
      setState({ days: [], loading: false })
      return
    }

    const unit = country === 'US' ? 'fahrenheit' : 'celsius'
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=${FORECAST_DAYS}` +
      `&temperature_unit=${unit}`

    let active = true
    let controller: AbortController | null = null
    let timer: number | undefined

    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }))

    const attempt = () => {
      if (!active) return
      if (controller) controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)

      const next = new AbortController()
      controller = next
      timer = window.setTimeout(() => next.abort(), FETCH_TIMEOUT_MS)

      fetch(url, { signal: next.signal })
        .then((res) =>
          res.ok ? res.json() : Promise.reject(new Error(String(res.status)))
        )
        .then((json) => {
          if (!active) return
          setState({ days: parseForecast(json), loading: false })
        })
        .catch(() => {
          if (!active) return
          setState({ days: [], loading: false })
        })
    }

    const handleOnline = () => attempt()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') attempt()
    }

    attempt()

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      if (controller) controller.abort()
      if (timer !== undefined) window.clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [hasCoords, lat, lon, country])

  return state
}
