import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatWidget } from './ChatWidget'

const chatMock = vi.hoisted(() => ({
  onNewMessages: undefined as ((count: number) => void) | undefined
}))

vi.mock('./ChatSection', () => ({
  ChatSection: ({ onNewMessages }: { onNewMessages?: (count: number) => void }) => {
    chatMock.onNewMessages = onNewMessages
    return <div data-testid="chat-section" />
  }
}))

describe('ChatWidget', () => {
  afterEach(() => {
    document.body.style.overflow = ''
    chatMock.onNewMessages = undefined
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

  it('mantiene el chat montado al cerrar y acumula mensajes nuevos', () => {
    render(<ChatWidget />)

    const chatNode = screen.getByTestId('chat-section')
    const launcher = screen.getByRole('button', { name: 'Chat en vivo' })

    act(() => chatMock.onNewMessages?.(2))

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(launcher).toHaveAccessibleName('Chat en vivo, 2 mensajes nuevos')

    fireEvent.click(launcher)

    expect(screen.queryByText('2')).toBeNull()
    expect(launcher).toHaveAccessibleName('Chat en vivo')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar chat' }))

    expect(screen.getByTestId('chat-section')).toBe(chatNode)
  })

  it('no acumula mensajes mientras el modal está abierto', () => {
    render(<ChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: 'Chat en vivo' }))
    act(() => chatMock.onNewMessages?.(3))

    expect(screen.getByRole('button', { name: 'Chat en vivo' })).toBeInTheDocument()
    expect(screen.queryByText('3')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar chat' }))

    expect(screen.getByRole('button', { name: 'Chat en vivo' })).toBeInTheDocument()
    expect(screen.queryByText('3')).toBeNull()
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
