import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PlayerBar } from './PlayerBar'
import type { LocalTrack, MicSnapshot } from '@/lib/live-console/types'

const current: LocalTrack = {
  id: 't1',
  name: 'uno.mp3',
  path: 'uno.mp3',
  title: 'Uno',
  artist: 'Artista',
  album: null,
  duration: 120,
  size: 1024,
  lastModified: 1,
  mimeType: 'audio/mpeg',
  source: 'file',
  available: true,
}

const next: LocalTrack = { ...current, id: 't2', name: 'dos.mp3', path: 'dos.mp3', title: 'Dos' }
const mic: MicSnapshot = { enabled: false, gain: 0, talkover: true, levelDb: -20, permission: 'granted' }

function renderBar(overrides: { playing?: boolean } = {}) {
  const handlers = {
    onPlay: vi.fn().mockResolvedValue(undefined),
    onPause: vi.fn(),
    onPrevious: vi.fn().mockResolvedValue(undefined),
    onNext: vi.fn().mockResolvedValue(undefined),
    onSeek: vi.fn(),
    onEnableMic: vi.fn().mockResolvedValue(true),
    onDisableMic: vi.fn(),
    onMicGain: vi.fn(),
    onMonitor: vi.fn(),
  }
  render(
    <PlayerBar
      current={current}
      nextTrack={next}
      playing={overrides.playing ?? false}
      position={10}
      duration={120}
      masterLevelDb={-12}
      mic={mic}
      monitorEnabled={false}
      {...handlers}
    />
  )
  return handlers
}

describe('PlayerBar', () => {
  it('muestra el tema actual y el siguiente', () => {
    renderBar()
    expect(screen.getByText('Uno')).toBeInTheDocument()
    expect(screen.getByText(/Siguiente:/)).toBeInTheDocument()
    expect(screen.getByText('Dos')).toBeInTheDocument()
  })

  it('dispara play, anterior y siguiente', () => {
    const handlers = renderBar()
    fireEvent.click(screen.getByLabelText('Reproducir'))
    fireEvent.click(screen.getByLabelText('Tema anterior'))
    fireEvent.click(screen.getByLabelText('Tema siguiente'))
    expect(handlers.onPlay).toHaveBeenCalledOnce()
    expect(handlers.onPrevious).toHaveBeenCalledOnce()
    expect(handlers.onNext).toHaveBeenCalledOnce()
  })

  it('pausa cuando está sonando y permite buscar', () => {
    const handlers = renderBar({ playing: true })
    fireEvent.click(screen.getByLabelText('Pausar'))
    fireEvent.change(screen.getByLabelText('Posición del tema'), { target: { value: '42' } })
    expect(handlers.onPause).toHaveBeenCalledOnce()
    expect(handlers.onSeek).toHaveBeenCalledWith(42)
  })

  it('controla micrófono y monitor', () => {
    const handlers = renderBar()
    fireEvent.click(screen.getByText('Mic OFF'))
    fireEvent.click(screen.getByText('Monitor OFF'))
    expect(handlers.onEnableMic).toHaveBeenCalledOnce()
    expect(handlers.onMonitor).toHaveBeenCalledWith(true)
  })
})
