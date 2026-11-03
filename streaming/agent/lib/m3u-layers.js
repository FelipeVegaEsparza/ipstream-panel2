// =====================================================
// Capas de locución IA dentro de playlist.m3u
// (intro del presentador + reseña, ancladas por trackId)
// =====================================================

import { join } from 'path'

/**
 * Decide si las capas de IA se insertan en el m3u.
 * Las reseñas respetan la frecuencia y el kill switch del admin.
 */
export function aiLayersEnabled(rs = {}, shuffle = false) {
  const every = Number(rs.aiReviewEveryTracks) || 0
  return {
    intros: Boolean(rs.aiPresenterEnabled) && Number(rs.aiPresenterEvery) > 0 && !shuffle,
    reviews: Boolean(rs.aiReviewAdminEnabled) && every > 0 && !shuffle,
  }
}

/**
 * Arma las líneas que van antes del tema: [intro][reseña].
 * La reseña siempre queda después de la presentación.
 */
export function buildAiLayerLines({
  trackId,
  introByTrack,
  reviewByTrack,
  introDir,
  reviewDir,
}) {
  const lines = []
  const introFile = introByTrack?.get(trackId)
  if (introFile) {
    lines.push('#EXTINF:-1,Locutor IA')
    lines.push(join(introDir, introFile))
  }
  const reviewFile = reviewByTrack?.get(trackId)
  if (reviewFile) {
    lines.push('#EXTINF:-1,Reseña IA')
    lines.push(join(reviewDir, reviewFile))
  }
  return lines
}
