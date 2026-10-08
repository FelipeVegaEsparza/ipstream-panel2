import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InstallPrompt, resetInstallPromptForTests } from './InstallPrompt'
import styles from './InstallPrompt.module.css'

interface PromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function dispatchBeforeInstall(prompt: () => Promise<void>, outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt') as PromptEvent
  event.prompt = prompt
  event.userChoice = Promise.resolve({ outcome })
  act(() => {
    window.dispatchEvent(event)
  })
}

beforeEach(() => {
  resetInstallPromptForTests()
})

afterEach(() => {
  resetInstallPromptForTests()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('InstallPrompt', () => {
  it('muestra los botones de Android y Apple', () => {
    render(<InstallPrompt />)
    expect(screen.getByRole('button', { name: 'Instalar en Android' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Instalar en iPhone o iPad' })
    ).toBeInTheDocument()
  })

  it('aplica el tono oscuro a los iconos con variant dark', () => {
    const { container } = render(<InstallPrompt variant="dark" />)
    expect(container.querySelector(`.${styles.dark}`)).not.toBeNull()
  })

  it('aplica el tamaño compacto con size compact', () => {
    const { container } = render(<InstallPrompt size="compact" />)
    expect(container.querySelector(`.${styles.compact}`)).not.toBeNull()
  })

  it('el botón Android dispara el prompt cuando está disponible', async () => {
    const promptMock = vi.fn().mockResolvedValue(undefined)
    dispatchBeforeInstall(promptMock, 'accepted')
    render(<InstallPrompt />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar en Android' }))

    await waitFor(() => expect(promptMock).toHaveBeenCalledTimes(1))
  })

  it('el botón Android sin prompt abre el modal de indicaciones', () => {
    render(<InstallPrompt />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar en Android' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Instalar la aplicación')).toBeInTheDocument()
  })

  it('el botón Apple abre el modal con las indicaciones de iOS', () => {
    render(<InstallPrompt />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar en iPhone o iPad' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Agregar a pantalla de inicio')).toBeInTheDocument()
  })

  it('el modal se cierra con el botón de cerrar', () => {
    render(<InstallPrompt />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar en iPhone o iPad' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('oculta los botones cuando la app ya está instalada', () => {
    render(<InstallPrompt />)
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(screen.queryByRole('button', { name: 'Instalar en Android' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Instalar en iPhone o iPad' })
    ).toBeNull()
  })

  it('oculta los botones en iOS instalado (navigator.standalone)', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true
    })
    render(<InstallPrompt />)

    expect(screen.queryByRole('button', { name: 'Instalar en Android' })).toBeNull()
    delete (window.navigator as Navigator & { standalone?: boolean }).standalone
  })

  it('oculta los botones en modo standalone', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(
        (query: string) =>
          ({
            matches: query.includes('display-mode: standalone'),
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn()
          }) as unknown as MediaQueryList
      )
    )

    render(<InstallPrompt />)

    expect(screen.queryByRole('button', { name: 'Instalar en Android' })).toBeNull()
  })
})
