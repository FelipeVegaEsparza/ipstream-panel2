import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { StreamingTrack } from '@/core/types'
import { MAX_HISTORY, useSongHistory } from './useSongHistory'

function track(title: string, artist = 'Artista'): StreamingTrack {
  return { title, artist, album: null, coverUrl: null, duration: 100, isJingle: false }
}

function Harness({ track: current }: { track: StreamingTrack | null }) {
  const history = useSongHistory('cmtest', current)
  return (
    <ul>
      {history.map((item) => (
        <li key={item.key}>{item.title}</li>
      ))}
    </ul>
  )
}

afterEach(() => {
  localStorage.clear()
})

describe('useSongHistory', () => {
  it('agrega el tema actual y no lo duplica', () => {
    const { rerender } = render(<Harness track={track('Tema A')} />)
    expect(screen.getAllByText('Tema A')).toHaveLength(1)

    rerender(<Harness track={track('Tema A')} />)
    expect(screen.getAllByText('Tema A')).toHaveLength(1)
  })

  it('agrega temas nuevos, con el más reciente primero, y respeta el límite', () => {
    const { rerender } = render(<Harness track={track('Tema 0')} />)
    for (let i = 1; i < MAX_HISTORY + 5; i += 1) {
      rerender(<Harness track={track(`Tema ${i}`)} />)
    }

    expect(screen.getAllByRole('listitem')).toHaveLength(MAX_HISTORY)
    expect(screen.getByText(`Tema ${MAX_HISTORY + 4}`)).toBeInTheDocument()
  })

  it('persiste y recupera el historial en el mismo navegador', () => {
    const { unmount } = render(<Harness track={track('Tema Persistido')} />)
    unmount()

    render(<Harness track={null} />)
    expect(screen.getByText('Tema Persistido')).toBeInTheDocument()
  })
})
