import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SoundEffectsPad } from './SoundEffectsPad'
import type { SoundEffect } from '@/lib/live-console/effects'

const effect: SoundEffect = {
  slot: 0,
  id: 'fx-1',
  name: 'Aplausos',
  fileName: 'Aplausos.wav',
  mimeType: 'audio/wav',
  blob: new Blob([new Uint8Array(8)], { type: 'audio/wav' }),
  gainDb: 0,
  createdAt: 1,
}

function renderPad() {
  const handlers = {
    onPadSize: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onGain: vi.fn().mockResolvedValue(undefined),
    onPlay: vi.fn().mockResolvedValue(undefined),
    onStopAll: vi.fn(),
  }
  render(
    <SoundEffectsPad
      padSize={4}
      slots={[effect, null, null, null]}
      loading={false}
      error={null}
      {...handlers}
    />
  )
  return handlers
}

describe('SoundEffectsPad', () => {
  it('muestra la botonera y los slots vacíos', () => {
    renderPad()
    expect(screen.getByText('Aplausos')).toBeInTheDocument()
    expect(screen.getAllByText('Agregar sonido')).toHaveLength(3)
  })

  it('reproduce, ajusta volumen y quita', () => {
    const handlers = renderPad()
    fireEvent.click(screen.getByTitle('Reproducir Aplausos'))
    fireEvent.change(screen.getByLabelText('Volumen de Aplausos'), { target: { value: '-6' } })
    fireEvent.click(screen.getByLabelText('Quitar Aplausos'))
    expect(handlers.onPlay).toHaveBeenCalledWith(0)
    expect(handlers.onGain).toHaveBeenCalledWith(0, -6)
    expect(handlers.onRemove).toHaveBeenCalledWith(0)
  })

  it('en modo biblioteca no permite agregar archivos locales', () => {
    render(
      <SoundEffectsPad
        padSize={4}
        slots={[effect, null, null, null]}
        loading={false}
        error={null}
        libraryMode
        manageHref="/dashboard/sound-effects"
        onPadSize={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onGain={vi.fn()}
        onPlay={vi.fn()}
        onStopAll={vi.fn()}
      />
    )
    expect(screen.queryByText('Agregar sonido')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Elegir efectos' })).toHaveAttribute(
      'href',
      '/dashboard/sound-effects'
    )
    expect(screen.queryByLabelText('Quitar Aplausos')).not.toBeInTheDocument()
  })

  it('cambia el tamaño de la botonera y detiene efectos', () => {
    const handlers = renderPad()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '12' } })
    fireEvent.click(screen.getByText('Detener'))
    expect(handlers.onPadSize).toHaveBeenCalledWith(12)
    expect(handlers.onStopAll).toHaveBeenCalledOnce()
  })
})
