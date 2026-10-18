import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VuMeter } from './VuMeter'

describe('VuMeter', () => {
  it('muestra la etiqueta y el nivel en dB', () => {
    render(<VuMeter db={-12} label="Master" />)
    expect(screen.getByText('Master')).toBeInTheDocument()
    expect(screen.getByText('-12.0 dB')).toBeInTheDocument()
  })

  it('maneja silencio', () => {
    render(<VuMeter db={-Infinity} label="Mic" />)
    expect(screen.getByText('-∞ dB')).toBeInTheDocument()
  })
})
