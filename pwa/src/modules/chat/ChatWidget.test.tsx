import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatWidget } from './ChatWidget'

vi.mock('./ChatSection', () => ({
  ChatSection: () => <div data-testid="chat-section" />
}))

describe('ChatWidget', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('abre el chat en un modal y devuelve el foco al cerrar', async () => {
    render(<ChatWidget />)

    const launcher = screen.getByRole('button', { name: 'Chat en vivo' })
    expect(launcher).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(launcher)

    const dialog = screen.getByRole('dialog', { name: 'Chat en vivo' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByTestId('chat-section')).toBeInTheDocument()
    expect(launcher).toHaveAttribute('aria-expanded', 'true')
    expect(document.body.style.overflow).toBe('hidden')

    await waitFor(() => expect(dialog).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar chat' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(launcher).toHaveFocus()
  })

  it('cierra el modal con Escape', async () => {
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: 'Chat en vivo' }))
    expect(screen.getByRole('dialog', { name: 'Chat en vivo' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Chat en vivo' })).toHaveFocus()
  })

  it('cierra el modal al pulsar el fondo', () => {
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: 'Chat en vivo' }))

    const dialog = screen.getByRole('dialog', { name: 'Chat en vivo' })
    fireEvent.click(dialog.parentElement!)

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
