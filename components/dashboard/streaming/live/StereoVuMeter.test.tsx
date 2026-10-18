import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StereoVuMeter } from './StereoVuMeter'

describe('StereoVuMeter', () => {
  it('muestra canales L/R y niveles', () => {
    render(<StereoVuMeter leftDb={-10} rightDb={-3} />)
    const left = screen.getByLabelText('Canal izquierdo')
    const right = screen.getByLabelText('Canal derecho')
    expect(left).toBeInTheDocument()
    expect(right).toBeInTheDocument()
    expect(within(left).getByText('-10')).toBeInTheDocument()
    expect(within(right).getByText('-3')).toBeInTheDocument()
  })

  it('ilumina segmentos según la señal', () => {
    render(<StereoVuMeter leftDb={-6} rightDb={-30} />)
    const left = screen.getByLabelText('Canal izquierdo')
    const right = screen.getByLabelText('Canal derecho')
    expect(left.querySelectorAll('[data-active="true"]').length).toBeGreaterThan(
      right.querySelectorAll('[data-active="true"]').length
    )
  })

  it('maneja silencio', () => {
    render(<StereoVuMeter leftDb={-Infinity} rightDb={-Infinity} />)
    expect(screen.getAllByText('-∞')).toHaveLength(2)
  })
})
