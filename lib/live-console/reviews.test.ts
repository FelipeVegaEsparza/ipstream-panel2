import { describe, expect, it } from 'vitest'
import {
  isReviewEligibleTrack,
  normalizeReviewEvery,
  reviewTracksRemaining,
  shouldPlayReview,
} from './reviews'

describe('frecuencia de reseñas en la consola', () => {
  it('normaliza la frecuencia y apaga con 0 o valores inválidos', () => {
    expect(normalizeReviewEvery(5)).toBe(5)
    expect(normalizeReviewEvery('7')).toBe(7)
    expect(normalizeReviewEvery(0)).toBe(0)
    expect(normalizeReviewEvery(1)).toBe(0)
    expect(normalizeReviewEvery(25)).toBe(20)
    expect(normalizeReviewEvery(undefined)).toBe(0)
  })

  it('solo acepta temas reales con artista y título', () => {
    expect(isReviewEligibleTrack({ artist: 'Artista', title: 'Tema' })).toBe(true)
    expect(isReviewEligibleTrack({ artist: '', title: 'Tema' })).toBe(false)
    expect(isReviewEligibleTrack({ artist: 'Artista', title: '  ' })).toBe(false)
    expect(isReviewEligibleTrack({ artist: 'A', title: 'B', kind: 'spot' })).toBe(false)
    expect(isReviewEligibleTrack({ artist: 'A', title: 'B', kind: 'jingle' })).toBe(false)
    expect(isReviewEligibleTrack(null)).toBe(false)
  })

  it('solo dispara la reseña cuando se cumple su contador propio', () => {
    const track = { artist: 'Artista', title: 'Tema' }
    expect(
      shouldPlayReview({ enabled: true, every: 5, tracksSinceReview: 4, track })
    ).toBe(false)
    expect(
      shouldPlayReview({ enabled: true, every: 5, tracksSinceReview: 5, track })
    ).toBe(true)
    expect(
      shouldPlayReview({ enabled: false, every: 5, tracksSinceReview: 5, track })
    ).toBe(false)
    expect(
      shouldPlayReview({ enabled: true, every: 0, tracksSinceReview: 5, track })
    ).toBe(false)
  })

  it('informa cuántos temas faltan para la próxima reseña', () => {
    expect(reviewTracksRemaining(5, 0)).toBe(5)
    expect(reviewTracksRemaining(5, 3)).toBe(2)
    expect(reviewTracksRemaining(5, 5)).toBe(0)
    expect(reviewTracksRemaining(0, 5)).toBe(0)
  })
})
