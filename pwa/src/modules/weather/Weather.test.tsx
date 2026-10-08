import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BasicLocation } from '@/core/types'
import { Weather } from './Weather'

const OSORNO: BasicLocation = {
  city: 'Osorno',
  region: 'Los Lagos',
  country: 'CL',
  latitude: -40.5733,
  longitude: -73.1336
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Weather', () => {
  it('muestra temperatura, ciudad y condición con ubicación', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        current_weather: { temperature: 12.4, weathercode: 0 }
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<Weather location={OSORNO} />)

    expect(await screen.findByText('Osorno')).toBeInTheDocument()
    expect(screen.getByText('12°C')).toBeInTheDocument()
    expect(screen.getByText('Despejado')).toBeInTheDocument()

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('latitude=-40.5733')
    expect(url).toContain('longitude=-73.1336')
    expect(url).toContain('celsius')
  })

  it('usa Fahrenheit si country es US', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          current_weather: { temperature: 60.0, weathercode: 1 }
        })
      )
    )

    render(
      <Weather location={{ ...OSORNO, country: 'US' }} />
    )

    expect(await screen.findByText('60°F')).toBeInTheDocument()
    const url = String((vi.mocked(fetch).mock.calls[0]?.[0]) ?? '')
    expect(url).toContain('fahrenheit')
  })

  it('no renderiza nada ni consulta sin ubicación', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<Weather location={null} />)

    expect(container.firstChild).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
