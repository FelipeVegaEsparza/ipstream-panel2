// =====================================================
// Capas de locución IA dentro de playlist.m3u
// (intro del presentador, ancladas por trackId)
// =====================================================

import { join } from 'path'

/** Decide si las intros del presentador se insertan en el m3u. */
export function aiLayersEnabled(rs = {}, shuffle = false) {
  return {
    intros: Boolean(rs.aiPresenterEnabled) && Number(rs.aiPresenterEvery) > 0 && !shuffle,
  }
}

/** Arma las líneas de la intro que van antes del tema. */
export function buildAiLayerLines({
  trackId,
  introByTrack,
  introDir,
}) {
  const lines = []
  const introFile = introByTrack?.get(trackId)
  if (introFile) {
    lines.push('#EXTINF:-1,Locutor IA')
    lines.push(join(introDir, introFile))
  }
  return lines
}
