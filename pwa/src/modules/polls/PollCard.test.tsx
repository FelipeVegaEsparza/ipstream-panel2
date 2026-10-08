import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import type { Poll } from '@/core/types'
import { PollCard } from './PollCard'

const baked = vi.hoisted(() => ({ clientId: null as string | null }))

vi.mock('@/core/config/tenant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/config/tenant')>()
  return {
    ...actual,
    getBakedClientId: () => baked.clientId,
    getBakedClientName: () => null
  }
})

const POLL: Poll = {
  id: 'p1',
  title: '¿Qué género musical prefieres?',
  active: true,
  options: [
    { id: 'o1', text: 'Rock', votes: 10 },
    { id: 'o2', text: 'Pop', votes: 5 }
  ],
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function renderPoll() {
  return render(
    <TenantProvider>
      <PollCard poll={POLL} />
    </TenantProvider>
  )
}

describe('PollCard', () => {
  afterEach(() => {
    baked.clientId = null
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('muestra las opciones cuando el usuario no ha votado', () => {
    baked.clientId = 'cmclient'
    renderPoll()
    expect(screen.getByRole('button', { name: 'Rock' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pop' })).toBeInTheDocument()
  })

  it('muestra resultados si ya votó (localStorage)', () => {
    localStorage.setItem('poll_p1', 'true')
    baked.clientId = 'cmclient'
    renderPoll()
    expect(screen.getByText('Rock')).toBeInTheDocument()
    expect(screen.getByText('10 · 67%')).toBeInTheDocument()
  })

  it('envía el voto, persiste la clave y muestra porcentajes', async () => {
    baked.clientId = 'cmclient'
    const updated = {
      ...POLL,
      options: [
        { id: 'o1', text: 'Rock', votes: 11 },
        { id: 'o2', text: 'Pop', votes: 5 }
      ]
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated))
    vi.stubGlobal('fetch', fetchMock)

    renderPoll()
    fireEvent.click(screen.getByRole('button', { name: 'Rock' }))

    await waitFor(() => expect(screen.getByText('11 · 69%')).toBeInTheDocument())
    expect(localStorage.getItem('poll_p1')).toBe('true')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('se renderiza y permite votar aunque localStorage lance', async () => {
    baked.clientId = 'cmclient'
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage bloqueado')
      },
      setItem: () => {
        throw new Error('storage bloqueado')
      }
    })
    const updated = {
      ...POLL,
      options: [
        { id: 'o1', text: 'Rock', votes: 11 },
        { id: 'o2', text: 'Pop', votes: 5 }
      ]
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, updated))
    vi.stubGlobal('fetch', fetchMock)

    renderPoll()
    expect(screen.getByRole('button', { name: 'Rock' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rock' }))

    await waitFor(() => expect(screen.getByText('11 · 69%')).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('no persiste ni muestra resultados si el voto falla', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: 'Opción no válida' }))
    vi.stubGlobal('fetch', fetchMock)

    renderPoll()
    fireEvent.click(screen.getByRole('button', { name: 'Rock' }))

    await waitFor(() =>
      expect(screen.getByText(/No se pudo enviar tu voto/)).toBeInTheDocument()
    )
    expect(localStorage.getItem('poll_p1')).toBeNull()
  })
})
