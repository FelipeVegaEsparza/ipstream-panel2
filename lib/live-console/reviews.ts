// =====================================================
// Reseñas IA en la consola en vivo (helpers puros)
// =====================================================

export interface ReviewEligibleTrack {
  kind?: string
  artist?: string | null
  title?: string | null
}

/** Frecuencia válida: 0 (apagada) o 2..20 temas. */
export function normalizeReviewEvery(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 2) return 0
  return Math.min(20, Math.max(2, Math.round(n)))
}

/** Solo temas reales, con artista y título, llevan reseña. */
export function isReviewEligibleTrack(track: ReviewEligibleTrack | null | undefined): boolean {
  if (!track) return false
  if (track.kind === 'spot' || track.kind === 'jingle' || track.kind === 'announcement') return false
  return Boolean((track.artist || '').trim() && (track.title || '').trim())
}

export function shouldPlayReview(input: {
  enabled: boolean
  every: number
  tracksSinceReview: number
  track: ReviewEligibleTrack | null | undefined
}): boolean {
  if (!input.enabled || input.every < 2) return false
  if (input.tracksSinceReview < input.every) return false
  return isReviewEligibleTrack(input.track)
}

/** Temas que faltan para la próxima reseña (0 = en el próximo tema). */
export function reviewTracksRemaining(every: number, tracksSinceReview: number): number {
  if (every < 2) return 0
  return Math.max(0, every - tracksSinceReview)
}
