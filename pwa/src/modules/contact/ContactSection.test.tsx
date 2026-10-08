import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TenantProvider } from '@/core/config/TenantContext'
import { ContactSection } from './ContactSection'

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

function renderContact() {
  return render(
    <TenantProvider>
      <ContactSection />
    </TenantProvider>
  )
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Nombre'), {
    target: { value: 'Juan Pérez' }
  })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'juan@mail.com' }
  })
  fireEvent.change(screen.getByLabelText('Teléfono'), {
    target: { value: '+56912345678' }
  })
  fireEvent.change(screen.getByLabelText('Mensaje'), {
    target: { value: 'Hola, quiero auspiciar' }
  })
}

afterEach(() => {
  baked.clientId = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ContactSection', () => {
  it('envía un único POST con los 4 campos y muestra el éxito al responder 201', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(201, { id: 'cm1', status: 'new', createdAt: '2025-01-01T00:00:00.000Z' })
      )
    vi.stubGlobal('fetch', fetchMock)

    renderContact()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('¡Gracias! Tu mensaje fue enviado.')
    ).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/api/public/cmclient/contact-messages')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Juan Pérez',
      email: 'juan@mail.com',
      phone: '+56912345678',
      message: 'Hola, quiero auspiciar'
    })

    expect(screen.getByLabelText('Nombre')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Teléfono')).toHaveValue('')
    expect(screen.getByLabelText('Mensaje')).toHaveValue('')
  })

  it('muestra el aviso anti-spam cuando el API responde 429', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { error: 'Too many requests' }))
    vi.stubGlobal('fetch', fetchMock)

    renderContact()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('Demasiados intentos. Intenta de nuevo en unos minutos.')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })

  it('muestra el error del API cuando responde 400', async () => {
    baked.clientId = 'cmclient'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(400, { error: 'El email no es válido' }))
    vi.stubGlobal('fetch', fetchMock)

    renderContact()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(
      await screen.findByText('El email no es válido')
    ).toBeInTheDocument()
  })

  it('deshabilita el botón mientras la solicitud está en curso', async () => {
    baked.clientId = 'cmclient'
    let resolveFetch: (value: Response) => void = () => {}
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    renderContact()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    const button = await screen.findByRole('button', { name: 'Enviando…' })
    expect(button).toBeDisabled()

    resolveFetch(
      jsonResponse(201, { id: 'cm1', status: 'new', createdAt: '2025-01-01T00:00:00.000Z' })
    )
    await screen.findByText('¡Gracias! Tu mensaje fue enviado.')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled()
  })
})
