import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { ChatSection } from './ChatSection'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function mockFetch() {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (method === 'POST' && url.includes('/chat/messages')) {
      return Promise.resolve(
        jsonResponse(200, {
          messages: [],
          serverTime: '2025-01-01T00:00:06.000Z',
          retentionHours: 24
        })
      )
    }

    if (url.includes('/chat/messages')) {
      return Promise.resolve(
        jsonResponse(200, {
          messages: [
            {
              id: 'm1',
              authorType: 'listener',
              name: 'Oyente 1',
              body: 'Hola radio!',
              email: null,
              createdAt: '2025-01-01T00:00:01.000Z'
            }
          ],
          serverTime: '2025-01-01T00:00:05.000Z',
          retentionHours: 24
        })
      )
    }

    if (url.includes('/chat/online')) {
      return Promise.resolve(jsonResponse(200, { count: 3, recentNames: [] }))
    }

    return Promise.resolve(jsonResponse(404, { error: 'not found' }))
  })
}

function renderChat() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <ChatSection />
      </TenantProvider>
    </QueryClientProvider>
  )
}

describe('ChatSection', () => {
  afterEach(() => {
    baked.clientId = null
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('muestra los mensajes y el conteo de oyentes', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    renderChat()

    expect(await screen.findByText('Hola radio!')).toBeInTheDocument()
    expect(await screen.findByText('3 oyentes activos')).toBeInTheDocument()
  })

  it('no envía un mensaje con campos vacíos', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    renderChat()
    await screen.findByText('Hola radio!')

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(await screen.findByText('Ingresa tu nombre y un mensaje.')).toBeInTheDocument()
    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === 'POST'
    )
    expect(postCalls.length).toBe(0)
  })

  it('envía un mensaje válido y refresca', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = mockFetch()
    vi.stubGlobal('fetch', fetchMock)

    renderChat()
    await screen.findByText('Hola radio!')

    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Oyente 2' }
    })
    fireEvent.change(screen.getByLabelText('Mensaje'), {
      target: { value: 'Buenas tardes' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    await waitFor(() => {
      const postCalls = fetchMock.mock.calls.filter(
        ([, init]) => init?.method === 'POST'
      )
      expect(postCalls.length).toBe(1)
    })
    expect(localStorage.getItem('ipstream_chat_name')).toBe('Oyente 2')
  })
})
