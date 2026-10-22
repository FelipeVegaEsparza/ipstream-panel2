import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StereoVuMeter } from './StereoVuMeter'
import { DashboardI18nProvider } from '@/components/providers/DashboardI18nProvider'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

function renderMeter(leftDb: number, rightDb: number) {
  return render(
    <DashboardI18nProvider locale="es">
      <StereoVuMeter leftDb={leftDb} rightDb={rightDb} />
    </DashboardI18nProvider>
  )
}

describe('StereoVuMeter', () => {
  it('muestra canales L/R y niveles', () => {
    renderMeter(-10, -3)
    const left = screen.getByLabelText('Canal izquierdo')
    const right = screen.getByLabelText('Canal derecho')
    expect(left).toBeInTheDocument()
    expect(right).toBeInTheDocument()
    expect(within(left).getByText('-10')).toBeInTheDocument()
    expect(within(right).getByText('-3')).toBeInTheDocument()
  })

  it('ilumina segmentos según la señal y cambia de color por intensidad', () => {
    renderMeter(-6, -30)
    const left = screen.getByLabelText('Canal izquierdo')
    const right = screen.getByLabelText('Canal derecho')
    expect(left.querySelectorAll('[data-active="true"]').length).toBeGreaterThan(
      right.querySelectorAll('[data-active="true"]').length
    )
    expect(left.querySelectorAll('[data-color="bg-red-500"]').length).toBeGreaterThan(0)
    expect(right.querySelectorAll('[data-color="bg-emerald-500"]').length).toBeGreaterThan(0)
  })

  it('maneja silencio', () => {
    renderMeter(-Infinity, -Infinity)
    expect(screen.getAllByText('-∞')).toHaveLength(2)
  })
})
