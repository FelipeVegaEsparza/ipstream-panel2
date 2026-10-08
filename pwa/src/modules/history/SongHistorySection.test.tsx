import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SongHistorySection } from './SongHistorySection'

const TRACKS = [
  {
    key: 'tema-a',
    title: 'Tema A',
    artist: 'Artista',
    coverUrl: null,
    at: 1
  }
]

describe('SongHistorySection', () => {
  it('muestra las canciones cuando hay historial', () => {
    render(<SongHistorySection tracks={TRACKS} />)
    expect(
      screen.getByRole('heading', { name: 'Canciones sonadas' })
    ).toBeInTheDocument()
    expect(screen.getByText('Tema A')).toBeInTheDocument()
  })

  it('no renderiza la sección sin historial', () => {
    const { container } = render(<SongHistorySection tracks={[]} />)
    expect(container.querySelector('section')).toBeNull()
  })
})
