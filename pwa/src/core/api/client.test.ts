import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './client'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('request', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('reintenta en errores 5xx hasta obtener éxito', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request('https://panelipstream.cl/api/public/x/basic-data', {
      retries: 1
    })

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('no reintenta en errores 4xx de cliente', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, { error: 'no encontrado' }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request('https://panelipstream.cl/api/public/x/news/slug', {
      retries: 3
    })

    expect(res.status).toBe(404)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reintenta cuando fetch falla por red', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request('https://panelipstream.cl/api/public/x/streaming', {
      retries: 1
    })

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('no reintenta escrituras (POST) ante error 5xx por defecto', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(500, { error: 'boom' }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await request('https://panelipstream.cl/api/public/x/polls/p/vote', {
      method: 'POST',
      body: JSON.stringify({ optionId: 'o1' })
    })

    expect(res.status).toBe(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplica solicitudes en vuelo para la misma url', async () => {
    const pending: Array<(r: Response) => void> = []
    const fetchMock = vi.fn(() => {
      return new Promise<Response>((resolve) => {
        pending.push(resolve)
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const url = 'https://panelipstream.cl/api/public/x/programs'
    const p1 = request(url)
    const p2 = request(url)

    pending[0]?.(jsonResponse(200, []))
    const [r1, r2] = await Promise.all([p1, p2])

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
