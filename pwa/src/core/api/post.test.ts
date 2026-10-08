import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendChatMessage, votePoll } from './index'
import { ApiError, isNotFoundError } from './errors'

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

describe('votePoll', () => {
  it('envía el optionId y devuelve la encuesta actualizada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        id: 'cmx',
        title: '¿Qué género?',
        active: true,
        options: [
          { id: 'o1', text: 'Rock', votes: 46 },
          { id: 'o2', text: 'Pop', votes: 32 }
        ],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z'
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const poll = await votePoll('cmclient', 'cmx', 'o1')

    expect(poll.options[0]?.votes).toBe(46)
    const call = fetchMock.mock.calls[0] as unknown[]
    const [url, init] = call as [string, RequestInit]
    expect(String(url)).toContain('/polls/cmx/vote')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ optionId: 'o1' })
  })

  it('lanza error sin reintentar en 4xx', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: 'Opción no válida' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(votePoll('cmclient', 'cmx', 'o1')).rejects.toThrow('HTTP 400')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lanza un ApiError tipado con el status HTTP', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, { error: 'no encontrada' }))
    vi.stubGlobal('fetch', fetchMock)

    const error = await votePoll('cmclient', 'cmx', 'o1').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect(isNotFoundError(error)).toBe(true)
  })

  it('no reintenta un POST que responde 5xx', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(500, { error: 'boom' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(votePoll('cmclient', 'cmx', 'o1')).rejects.toThrow('HTTP 500')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('sendChatMessage', () => {
  it('envía name, email y body al endpoint de chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        messages: [],
        serverTime: '2025-01-01T00:00:05.000Z',
        retentionHours: 24
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await sendChatMessage('cmclient', {
      name: 'Oyente 1',
      email: 'oyente@mail.com',
      body: 'Hola radio!'
    })

    const call = fetchMock.mock.calls[0] as unknown[]
    const [url, init] = call as [string, RequestInit]
    expect(String(url)).toContain('/chat/messages')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Oyente 1',
      email: 'oyente@mail.com',
      body: 'Hola radio!'
    })
  })
})
