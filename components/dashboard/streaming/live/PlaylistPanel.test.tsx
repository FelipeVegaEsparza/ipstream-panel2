import { DashboardI18nProvider } from '@/components/providers/DashboardI18nProvider'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
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

const one = track('t2', 'Segundo')
const two = track('t3', 'Tercero')
const spot = { ...track('t4', 'Mensaje para los oyentes'), kind: 'spot' as const }

function renderPlaylist(history: LocalTrack[] = [], queue: LocalTrack[] = [one, two]) {
  const handlers = {
    onPlayNow: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn(),
    onClear: vi.fn(),
    onMove: vi.fn(),
  }
  render(
    <DashboardI18nProvider locale="es">
    <PlaylistPanel
      queue={queue}
      history={history}
      {...handlers}
    />
    </DashboardI18nProvider>
  )
  return handlers
}

describe('PlaylistPanel', () => {
  it('muestra la cola', () => {
    renderPlaylist()
    expect(screen.getByText('Segundo')).toBeInTheDocument()
    expect(screen.getByText('Tercero')).toBeInTheDocument()
  })

  it('mantiene los temas que ya sonaron', () => {
    renderPlaylist([track('t1', 'Primero')])
    expect(screen.getByText('Ya sonaron')).toBeInTheDocument()
    expect(screen.getByText('Primero')).toBeInTheDocument()
    expect(screen.getByText('1 sonó')).toBeInTheDocument()
  })

  it('marca las locuciones en la cola y en el historial', () => {
    renderPlaylist([spot], [spot])
    expect(screen.getAllByText('Locución')).toHaveLength(2)
  })

  it('reproduce, mueve, quita y vacía', () => {
    const handlers = renderPlaylist()
    fireEvent.click(screen.getByLabelText('Reproducir Segundo'))
    fireEvent.click(screen.getByLabelText('Subir Tercero'))
    fireEvent.click(screen.getByLabelText('Bajar Segundo'))
    fireEvent.click(screen.getByLabelText('Quitar Segundo de la lista'))
    fireEvent.click(screen.getByText('Vaciar cola'))
    expect(handlers.onPlayNow).toHaveBeenCalledWith(one)
    expect(handlers.onMove).toHaveBeenCalledWith('t3', -1)
    expect(handlers.onMove).toHaveBeenCalledWith('t2', 1)
    expect(handlers.onRemove).toHaveBeenCalledWith('t2')
    expect(handlers.onClear).toHaveBeenCalledOnce()
  })
})
