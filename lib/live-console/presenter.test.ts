import { describe, expect, it } from 'vitest'
import { buildPresenterText } from './presenter'
import type { LocalTrack } from './types'

const track: LocalTrack = {
  id: '1',
  name: 'cancion.mp3',
  path: 'cancion.mp3',
  title: 'La canción',
  artist: 'El artista',
  album: null,
  duration: 200,
  size: 1,
  lastModified: 1,
  mimeType: 'audio/mpeg',
  source: 'file',
  file: null,
  handle: null,
  available: true,
}

describe('buildPresenterText', () => {
  it('incluye radio, tema y artista', () => {
    expect(buildPresenterText('Radio X', track)).toContain('Radio X')
    expect(buildPresenterText('Radio X', track)).toContain('La canción')
    expect(buildPresenterText('Radio X', track)).toContain('El artista')
  })

  it('usa el nombre del archivo si no hay título y no supera 300 caracteres', () => {
    const text = buildPresenterText('Radio X', { ...track, title: '', name: 'tema.mp3' })
    expect(text).toContain('tema')
    expect(text.length).toBeLessThanOrEqual(300)
  })
})
