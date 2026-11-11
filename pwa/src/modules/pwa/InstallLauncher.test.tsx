import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InstallLauncher } from './InstallLauncher'
import { resetInstallPromptForTests } from './InstallPrompt'
import styles from './InstallLauncher.module.css'

interface PromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function dispatchBeforeInstall(
  prompt: () => Promise<void>,
  outcome: 'accepted' | 'dismissed'
) {
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

describe('InstallLauncher', () => {
  it('muestra el lanzador flotante de instalación', () => {
    render(<InstallLauncher />)
    expect(
      screen.getByRole('button', { name: 'Instalar aplicación' })
    ).toBeInTheDocument()
    expect(screen.getByText('Instalar app')).toBeInTheDocument()
  })

  it('se apila debajo del chat cuando withChat está activo', () => {
    const { container } = render(<InstallLauncher withChat />)
    expect(container.querySelector(`.${styles.withChat}`)).not.toBeNull()
  })

  it('dispara el instalador nativo cuando está disponible', async () => {
    const promptMock = vi.fn().mockResolvedValue(undefined)
    dispatchBeforeInstall(promptMock, 'accepted')
    render(<InstallLauncher />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicación' }))

    await waitFor(() => expect(promptMock).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Instalar aplicación' })
      ).toBeNull()
    )
  })

  it('abre las indicaciones si el navegador no ofrece el prompt', () => {
    render(<InstallLauncher />)

    fireEvent.click(screen.getByRole('button', { name: 'Instalar aplicación' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Instalar la aplicación')).toBeInTheDocument()
  })

  it('se oculta cuando la app queda instalada', () => {
    render(<InstallLauncher />)
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(
      screen.queryByRole('button', { name: 'Instalar aplicación' })
    ).toBeNull()
  })

  it('se oculta si ya corre en modo standalone', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('display-mode: standalone'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    )
    render(<InstallLauncher />)

    expect(
      screen.queryByRole('button', { name: 'Instalar aplicación' })
    ).toBeNull()
  })
})
