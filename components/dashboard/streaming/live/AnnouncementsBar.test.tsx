import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AnnouncementsBar } from './AnnouncementsBar'

function renderBar(overrides: {
  loading?: 'weather' | 'time' | null
  error?: string | null
  voice?: 'male' | 'female' | 'premium'
  premiumAvailable?: boolean
} = {}) {
  const handlers = {
    onAnnounce: vi.fn().mockResolvedValue(undefined),
    onVoice: vi.fn(),
  }
  render(
    <AnnouncementsBar
      loading={overrides.loading ?? null}
      error={overrides.error ?? null}
      voice={overrides.voice ?? 'male'}
      premiumAvailable={overrides.premiumAvailable ?? false}
      {...handlers}
    />
  )
  return handlers
}

describe('AnnouncementsBar', () => {
  it('dispara clima y hora', () => {
    const handlers = renderBar()
    fireEvent.click(screen.getByText('Clima'))
    fireEvent.click(screen.getByText('Hora'))
    expect(handlers.onAnnounce).toHaveBeenNthCalledWith(1, 'weather')
    expect(handlers.onAnnounce).toHaveBeenNthCalledWith(2, 'time')
  })

  it('permite cambiar la voz', () => {
    const handlers = renderBar()
    fireEvent.change(screen.getByLabelText('Voz de la locución'), { target: { value: 'female' } })
    expect(handlers.onVoice).toHaveBeenCalledWith('female')
  })

  it('muestra la voz premium y la selecciona', () => {
    const handlers = renderBar({ premiumAvailable: true, voice: 'premium' })
    const select = screen.getByLabelText('Voz de la locución') as HTMLSelectElement
    expect(select.value).toBe('premium')
    expect(screen.getByRole('option', { name: /Voz premium/ })).toBeInTheDocument()
    fireEvent.change(select, { target: { value: 'male' } })
    expect(handlers.onVoice).toHaveBeenCalledWith('male')
  })

  it('bloquea mientras genera y muestra el estado', () => {
    renderBar({ loading: 'weather' })
    expect(screen.getByText(/Generando clima/)).toBeInTheDocument()
    expect(screen.getByText('Clima')).toBeDisabled()
  })

  it('muestra el error', () => {
    renderBar({ error: 'Configurá tu ciudad en Datos Básicos.' })
    expect(screen.getByText(/Configurá tu ciudad/)).toBeInTheDocument()
  })
})
