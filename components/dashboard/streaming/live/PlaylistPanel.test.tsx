import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PlaylistPanel } from './PlaylistPanel'
import type { LocalTrack } from '@/lib/live-console/types'

function track(id: string, title: string): LocalTrack {
  return {
    id,
    name: `${title}.mp3`,
    path: `${title}.mp3`,
    title,
    artist: 'Artista',
    album: null,
    duration: 100,
    size: 1024,
    lastModified: 1,
    mimeType: 'audio/mpeg',
    source: 'file',
    available: true,
  }
}

const current = track('t1', 'Actual')
const one = track('t2', 'Segundo')
const two = track('t3', 'Tercero')

function renderPlaylist() {
  const handlers = {
    onPlayNow: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn(),
    onClear: vi.fn(),
    onMove: vi.fn(),
  }
  render(
    <PlaylistPanel
      queue={[one, two]}
      current={current}
      nextTrack={one}
      playing
      {...handlers}
    />
  )
  return handlers
}

describe('PlaylistPanel', () => {
  it('muestra actual, siguiente y la cola', () => {
    renderPlaylist()
    expect(screen.getByText('Actual')).toBeInTheDocument()
    expect(screen.getAllByText('Segundo').length).toBeGreaterThan(0)
    expect(screen.getByText('Tercero')).toBeInTheDocument()
  })

  it('reproduce, mueve, quita y vacía', () => {
    const handlers = renderPlaylist()
    fireEvent.click(screen.getByLabelText('Reproducir Segundo'))
    fireEvent.click(screen.getByLabelText('Subir Tercero'))
    fireEvent.click(screen.getByLabelText('Bajar Segundo'))
    fireEvent.click(screen.getByLabelText('Quitar Segundo de la lista'))
    fireEvent.click(screen.getByText('Vaciar lista'))
    expect(handlers.onPlayNow).toHaveBeenCalledWith(one)
    expect(handlers.onMove).toHaveBeenCalledWith('t3', -1)
    expect(handlers.onMove).toHaveBeenCalledWith('t2', 1)
    expect(handlers.onRemove).toHaveBeenCalledWith('t2')
    expect(handlers.onClear).toHaveBeenCalledOnce()
  })
})
