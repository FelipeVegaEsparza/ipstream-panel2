import { DashboardI18nProvider } from '@/components/providers/DashboardI18nProvider'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AnnouncementsBar } from './AnnouncementsBar'

function renderBar(overrides: {
  loading?: 'weather' | 'time' | null
  error?: string | null
  compact?: boolean
} = {}) {
  const handlers = {
    onAddToQueue: vi.fn(),
  }
  render(
    <DashboardI18nProvider locale="es">
    <AnnouncementsBar
      loading={overrides.loading ?? null}
      error={overrides.error ?? null}
      compact={overrides.compact}
      {...handlers}
    />
    </DashboardI18nProvider>
  )
  return handlers
}

describe('AnnouncementsBar', () => {
  it('agrega clima y hora a la lista', () => {
    const handlers = renderBar()
    fireEvent.click(screen.getByText('Clima'))
    fireEvent.click(screen.getByText('Hora'))
    expect(handlers.onAddToQueue).toHaveBeenNthCalledWith(1, 'weather')
    expect(handlers.onAddToQueue).toHaveBeenNthCalledWith(2, 'time')
  })

  it('en modo compacto usa la voz por defecto y no muestra selector', () => {
    const handlers = renderBar({ compact: true })
    expect(screen.queryByLabelText('Voz de la locución')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Clima'))
    expect(handlers.onAddToQueue).toHaveBeenCalledWith('weather')
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
