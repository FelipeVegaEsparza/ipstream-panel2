import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentModal } from './ContentModal'

describe('ContentModal', () => {
  it('no renderiza nada cuando está cerrado', () => {
    render(
      <ContentModal open={false} onClose={() => {}}>
        contenido
      </ContentModal>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('muestra el contenido y cierra con el botón', () => {
    const onClose = vi.fn()
    render(
      <ContentModal open title="Listado" onClose={onClose}>
        <p>hola</p>
      </ContentModal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Listado')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('cierra con la tecla Escape', () => {
    const onClose = vi.fn()
    render(
      <ContentModal open onClose={onClose}>
        <p>hola</p>
      </ContentModal>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
