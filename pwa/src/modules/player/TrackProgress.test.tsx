import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrackProgress } from './TrackProgress'

describe('TrackProgress', () => {
  it('muestra tiempos mm:ss cuando hay duración', () => {
    render(
      <TrackProgress duration={100} trackKey="trk_1" isPlaying={false} />
    )
    expect(screen.getByText('0:00')).toBeInTheDocument()
    expect(screen.getByText('1:40')).toBeInTheDocument()
  })

  it('no renderiza nada sin duración', () => {
    const { container } = render(
      <TrackProgress duration={null} trackKey="trk_1" isPlaying={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('variante thin no muestra las etiquetas de tiempo', () => {
    const { container } = render(
      <TrackProgress
        variant="thin"
        duration={100}
        trackKey="trk_1"
        isPlaying={false}
      />
    )
    expect(screen.queryByText('0:00')).toBeNull()
    expect(screen.queryByText('1:40')).toBeNull()
    expect(container.firstChild).not.toBeNull()
  })
})
