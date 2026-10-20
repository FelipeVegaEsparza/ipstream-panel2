import { describe, expect, it } from 'vitest'
import { fileToTrack, filesToTracks } from './library'
import { trackIdFor } from './audio-math'

function makeFile(name: string, type = 'audio/mpeg', size = 4): File {
  return new File([new Uint8Array(size)], name, { type, lastModified: 1700000000000 })
}

describe('local library', () => {
  it('crea tracks desde archivos y filtra no-audio', () => {
    const tracks = filesToTracks([
      makeFile('Artista - Tema.mp3'),
      makeFile('nota.txt', 'text/plain'),
    ])
    expect(tracks).toHaveLength(1)
    expect(tracks[0].title).toBe('Tema')
    expect(tracks[0].artist).toBe('Artista')
    expect(tracks[0].available).toBe(true)
    expect(tracks[0].source).toBe('file')
  })

  it('usa el nombre como fallback de título', () => {
    const track = fileToTrack(makeFile('solo_un_tema.flac', 'audio/flac'))
    expect(track.title).toBe('solo un tema')
    expect(track.artist).toBeNull()
  })

  it('asocia cover.jpg del mismo directorio al track', () => {
    const cover = makeFile('cover.jpg', 'image/jpeg')
    const tracks = filesToTracks([makeFile('Artista - Tema.mp3'), cover])
    expect(tracks).toHaveLength(1)
    expect(tracks[0].coverFile).toBe(cover)
  })

  it('genera ids estables por path/tamaño/fecha', () => {
    const a = trackIdFor('a/b.mp3', 10, 20)
    const b = trackIdFor('a/b.mp3', 10, 20)
    const c = trackIdFor('a/b.mp3', 11, 20)
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
