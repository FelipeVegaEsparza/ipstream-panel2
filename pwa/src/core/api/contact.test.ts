import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendContactMessage } from './index'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

const INPUT = {
  name: 'Juan Pérez',
  email: 'juan@mail.com',
  phone: '+56912345678',
  message: 'Hola, me interesa auspiciar su radio.'
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sendContactMessage', () => {
  it('hace un POST con los 4 campos a la URL del tenant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(201, { id: 'cm1', status: 'new', createdAt: '2025-01-01T00:00:00.000Z' })
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendContactMessage('cmclient', INPUT)

    expect(result).toEqual({ status: 'sent' })
    const call = fetchMock.mock.calls[0] as unknown[]
    const [url, init] = call as [string, RequestInit]
    expect(String(url)).toBe(
      'https://panelipstream.cl/api/public/cmclient/contact-messages'
    )
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(String(init.body))).toEqual(INPUT)
    expect(Object.keys(JSON.parse(String(init.body))).sort()).toEqual([
      'email',
      'message',
      'name',
      'phone'
    ])
  })

  it('mapea 201 a sent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(201, { id: 'cm1', status: 'new', createdAt: '2025-01-01T00:00:00.000Z' })
      )
    )
    await expect(sendContactMessage('cmclient', INPUT)).resolves.toEqual({
      status: 'sent'
    })
  })

  it('mapea 400 a validation-error con el error del body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { error: 'El email no es válido' }))
    )
    await expect(sendContactMessage('cmclient', INPUT)).resolves.toEqual({
      status: 'validation-error',
      error: 'El email no es válido'
    })
  })

  it('mapea 400 sin error legible a validation-error con mensaje genérico', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(400, { detail: 'nope' }))
    )
    const result = await sendContactMessage('cmclient', INPUT)
    expect(result.status).toBe('validation-error')
    expect(result.status === 'validation-error' && result.error.length).toBeGreaterThan(0)
  })

  it('mapea 429 a rate-limited', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(429, { error: 'Too many requests' }))
    )
    await expect(sendContactMessage('cmclient', INPUT)).resolves.toEqual({
      status: 'rate-limited'
    })
  })

  it('mapea 404 a not-found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(404, { error: 'not found' }))
    )
    await expect(sendContactMessage('cmclient', INPUT)).resolves.toEqual({
      status: 'not-found'
    })
  })

  it('mapea 500 a server-error sin reintentar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: 'boom' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendContactMessage('cmclient', INPUT)).resolves.toEqual({
      status: 'server-error'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('mapea error de red a network-error sin reintentar', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendContactMessage('cmclient', INPUT)).resolves.toEqual({
      status: 'network-error'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
