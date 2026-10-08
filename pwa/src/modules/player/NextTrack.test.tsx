import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NextTrack } from './NextTrack'

const NEXT = {
  title: 'Take on Me',
  artist: 'a-ha',
  album: 'Hunting High and Low',
  coverUrl: null,
  duration: 289,
  isJingle: false
}

describe('NextTrack', () => {
  it('muestra título y artista cuando hay siguiente tema', () => {
    render(<NextTrack next={NEXT} />)
    expect(screen.getByText('A continuación')).toBeInTheDocument()
    expect(screen.getByText('Take on Me')).toBeInTheDocument()
    expect(screen.getByText('a-ha')).toBeInTheDocument()
  })

  it('no renderiza nada sin siguiente tema', () => {
    const { container } = render(<NextTrack next={null} />)
    expect(container.firstChild).toBeNull()
  })
})
