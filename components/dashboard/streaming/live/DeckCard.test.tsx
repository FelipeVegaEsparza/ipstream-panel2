import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DeckCard } from './DeckCard'
import type { DeckSnapshot } from '@/lib/live-console/types'

function deck(overrides: Partial<DeckSnapshot> = {}): DeckSnapshot {
  return {
    id: 'A',
    track: {
      id: 'track-1',
      name: 'tema.mp3',
      path: 'tema.mp3',
      title: 'Tema',
      artist: 'Artista',
      album: null,
      duration: 200,
      size: 1024,
      lastModified: 1,
      mimeType: 'audio/mpeg',
      source: 'file',
      available: true,
    },
    playing: false,
    position: 10,
    duration: 200,
    gain: 0,
    eq: { low: 0, mid: 0, high: 0 },
    loop: { enabled: false, start: 0, end: 0, quantized: false },
    cue: false,
    bpm: 120,
    bpmConfidence: 0.5,
    mode: 'buffer',
    ...overrides,
  }
}

function renderDeck(overrides: Partial<DeckSnapshot> = {}) {
  const handlers = {
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onSeek: vi.fn(),
    onGain: vi.fn(),
    onEq: vi.fn(),
    onLoop: vi.fn(),
    onClearLoop: vi.fn(),
    onToggleCue: vi.fn(),
  }
  render(<DeckCard deck={deck(overrides)} cue={false} {...handlers} />)
  return handlers
}

describe('DeckCard', () => {
  it('muestra el track y el BPM', () => {
    renderDeck()
    expect(screen.getByText('Tema')).toBeInTheDocument()
    expect(screen.getByText('Artista')).toBeInTheDocument()
    expect(screen.getByText('120.0 BPM')).toBeInTheDocument()
  })

  it('dispara play y cue', () => {
    const handlers = renderDeck()
    fireEvent.click(screen.getByLabelText('Reproducir'))
    fireEvent.click(screen.getByText('CUE'))
    expect(handlers.onPlay).toHaveBeenCalledOnce()
    expect(handlers.onToggleCue).toHaveBeenCalledOnce()
  })

  it('crea un loop manual desde la posición actual', () => {
    const handlers = renderDeck()
    fireEvent.click(screen.getByText('IN'))
    expect(handlers.onLoop).toHaveBeenCalledWith(
      expect.objectContaining({ start: 10, enabled: false })
    )
    fireEvent.click(screen.getByText('OUT'))
    expect(handlers.onLoop).toHaveBeenCalledWith(
      expect.objectContaining({ end: 10, enabled: true })
    )
  })

  it('ofrece beat loops solo si hay BPM', () => {
    renderDeck({ bpm: null })
    expect(screen.getByText('Beat loop requiere BPM')).toBeInTheDocument()
    expect(screen.getByText('¼')).toBeDisabled()
  })

  it('deshabilita controles sin track', () => {
    renderDeck({ track: null, mode: null })
    expect(screen.getByLabelText('Reproducir')).toBeDisabled()
    expect(screen.getByText('IN')).toBeDisabled()
  })
})
