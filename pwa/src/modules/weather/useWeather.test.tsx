import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BasicLocation } from '@/core/types'
import { useWeather } from './useWeather'

const LOCATION: BasicLocation = {
  city: 'X',
  country: 'CL',
  latitude: -33,
  longitude: -70
}

function Harness({
  refreshIntervalMs
}: {
  refreshIntervalMs: number
}) {
  const data = useWeather(LOCATION, { refreshIntervalMs })
  return <span>{data ? String(Math.round(data.temperature)) : 'none'}</span>
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useWeather refresco periódico', () => {
  it('vuelve a consultar tras el intervalo configurado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ current_weather: { temperature: 20, weathercode: 0 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<Harness refreshIntervalMs={600_000} />)

    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(600_000)
    })

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1))
  })

  it('no refresca si el intervalo es 0', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ current_weather: { temperature: 20, weathercode: 0 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<Harness refreshIntervalMs={0} />)

    await waitFor(() => expect(screen.getByText('20')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(600_000)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
