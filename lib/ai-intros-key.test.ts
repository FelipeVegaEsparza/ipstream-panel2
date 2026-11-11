import { describe, expect, it } from 'vitest'
import { computePlaylistIntrosKey } from './ai-intros-key'

const base = {
  station: 'Radio Fusión Austral',
  every: 3,
  phrases: ['Suena {{titulo}} de {{artista}}'],
  trackIds: ['t1', 't2', 't3', 't4'],
  aiVoiceId: 'voice-1',
  fishVoiceId: null,
  aiVoiceStyle: 0,
  aiVoicePreset: null,
}

describe('computePlaylistIntrosKey', () => {
  it('es estable para el mismo contenido', () => {
    expect(computePlaylistIntrosKey(base)).toBe(computePlaylistIntrosKey({ ...base }))
  })

  it('cambia si cambia el orden o los temas', () => {
    const reordered = { ...base, trackIds: ['t2', 't1', 't3', 't4'] }
    const added = { ...base, trackIds: ['t1', 't2', 't3', 't4', 't5'] }
    expect(computePlaylistIntrosKey(reordered)).not.toBe(computePlaylistIntrosKey(base))
    expect(computePlaylistIntrosKey(added)).not.toBe(computePlaylistIntrosKey(base))
  })

  it('cambia si cambian frecuencia, frases o voz', () => {
    expect(computePlaylistIntrosKey({ ...base, every: 4 })).not.toBe(
      computePlaylistIntrosKey(base)
    )
    expect(computePlaylistIntrosKey({ ...base, phrases: ['Otra frase'] })).not.toBe(
      computePlaylistIntrosKey(base)
    )
    expect(computePlaylistIntrosKey({ ...base, fishVoiceId: 'fish-1' })).not.toBe(
      computePlaylistIntrosKey(base)
    )
    expect(computePlaylistIntrosKey({ ...base, station: 'Otra radio' })).not.toBe(
      computePlaylistIntrosKey(base)
    )
  })
})
