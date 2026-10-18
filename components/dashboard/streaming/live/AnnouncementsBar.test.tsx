import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AnnouncementsBar } from './AnnouncementsBar'

function renderBar(overrides: { loading?: 'weather' | 'time' | null; error?: string | null } = {}) {
  const onAnnounce = vi.fn().mockResolvedValue(undefined)
  render(
    <AnnouncementsBar
      loading={overrides.loading ?? null}
      error={overrides.error ?? null}
      onAnnounce={onAnnounce}
    />
  )
  return onAnnounce
}

describe('AnnouncementsBar', () => {
  it('dispara clima y hora', () => {
    const onAnnounce = renderBar()
    fireEvent.click(screen.getByText('Clima'))
    fireEvent.click(screen.getByText('Hora'))
    expect(onAnnounce).toHaveBeenNthCalledWith(1, 'weather')
    expect(onAnnounce).toHaveBeenNthCalledWith(2, 'time')
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
