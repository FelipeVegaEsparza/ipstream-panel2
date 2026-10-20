import { describe, expect, it } from 'vitest'
import { sanitizeArtist, sanitizeTrackMetadata, sanitizeTrackTitle } from './track-text'

describe('sanitizeTrackTitle', () => {
  it('quita sufijos de video/audio, calidad y códigos', () => {
    expect(sanitizeTrackTitle('Desire (Official Music Video)', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire [Official Video] [HD]', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire (Video Oficial) (4K)', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire - Official Video', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire 1080p', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire [dQw4w9WgXcQ]', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire (Remastered 2011)', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire (Letra / Lyrics)', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('Desire (En Vivo)', 'U2')).toBe('Desire')
  })

  it('quita el artista repetido al inicio y números de pista', () => {
    expect(sanitizeTrackTitle('U2 - Desire (Official Video)', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('01. Desire (Official Audio)', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('U2 (Official) - Desire', 'U2')).toBe('Desire')
    expect(sanitizeTrackTitle('U2VEVO - Desire', 'U2VEVO')).toBe('Desire')
  })

  it('conserva paréntesis que son parte del título', () => {
    expect(sanitizeTrackTitle("(I Can't Get No) Satisfaction", 'The Rolling Stones'))
      .toBe("(I Can't Get No) Satisfaction")
    expect(sanitizeTrackTitle('Song (feat. Invitado)', 'Artista')).toBe('Song (feat. Invitado)')
    expect(sanitizeTrackTitle('Song (Remix)', 'Artista')).toBe('Song (Remix)')
    expect(sanitizeTrackTitle('99 Problems', 'Jay-Z')).toBe('99 Problems')
    expect(sanitizeTrackTitle('Clean', 'Taylor Swift')).toBe('Clean')
    expect(sanitizeTrackTitle('Song (Clean)', 'Artista')).toBe('Song')
  })
})

describe('sanitizeArtist', () => {
  it('quita Topic, VEVO y sufijos de video', () => {
    expect(sanitizeArtist('U2VEVO')).toBe('U2')
    expect(sanitizeArtist('U2 - Topic')).toBe('U2')
    expect(sanitizeArtist('U2 (Official Video)')).toBe('U2')
    expect(sanitizeArtist('Clean Bandit')).toBe('Clean Bandit')
  })
})

describe('sanitizeTrackMetadata', () => {
  it('devuelve ambos campos limpios', () => {
    expect(sanitizeTrackMetadata('Desire (Official Music Video)', 'U2VEVO')).toEqual({
      title: 'Desire',
      artist: 'U2',
    })
  })
})
