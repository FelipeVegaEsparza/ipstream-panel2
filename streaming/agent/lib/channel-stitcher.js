// =====================================================
// Channel Stitcher (VOD2Live)
// =====================================================
// Construye un manifiesto HLS EN VIVO para un canal de TV a partir de assets
// VOD ya empaquetados (segmentos .ts + playlist VOD por track). No re-encodea:
// solo referencia segmentos y encadena assets con EXT-X-DISCONTINUITY.
//
// Modelo: cada asset tiene una lista ordenada de segmentos con su duración.
// El canal es un ciclo determinista de assets. La posición "ahora" se calcula
// por reloj contra un ancla (epoch) para que todos los espectadores vean lo
// mismo. Se emite una ventana deslizante de segmentos recientes.

/** Parsea una playlist HLS VOD y devuelve [{uri, dur}] + duración total. */
export function parseVodPlaylist(text, baseUri = '') {
  const segments = []
  let dur = null
  for (const raw of String(text).split('\n')) {
    const line = raw.trim()
    if (line.startsWith('#EXTINF:')) {
      dur = parseFloat(line.slice('#EXTINF:'.length).split(',')[0])
    } else if (line && !line.startsWith('#')) {
      const uri = baseUri ? baseUri.replace(/\/$/, '') + '/' + line.replace(/^\//, '') : line
      segments.push({ uri, dur: Number.isFinite(dur) ? dur : 0 })
      dur = null
    }
  }
  const total = segments.reduce((s, x) => s + x.dur, 0)
  return { segments, total }
}

/**
 * Construye el ciclo (timeline plana) a partir de los assets.
 * Cada asset: { trackId, segments: [{uri, dur}] }
 * Devuelve { flat, total, discontPerCycle } donde flat = [{trackId, file, dur, assetIndex, cumStart}]
 */
export function buildCycle(assets) {
  const flat = []
  let cumStart = 0
  let assetIndex = 0
  for (const a of assets) {
    if (!a.segments || a.segments.length === 0) { assetIndex++; continue }
    for (const s of a.segments) {
      const durMs = Math.round(s.dur * 1000)
      flat.push({ trackId: a.trackId, file: s.uri, dur: durMs, assetIndex, cumStart })
      cumStart += durMs
    }
    assetIndex++
  }
  const total = cumStart
  // Discontinuidades dentro del ciclo (cambios de asset) + 1 por el wrap final.
  let boundaries = 0
  for (let i = 1; i < flat.length; i++) {
    if (flat[i].assetIndex !== flat[i - 1].assetIndex) boundaries++
  }
  const discontPerCycle = flat.length > 0 ? boundaries + 1 : 0
  return { flat, total, discontPerCycle }
}

function indexAtPosition(flat, total, p) {
  if (flat.length === 0) return 0
  const pos = ((p % total) + total) % total
  // búsqueda binaria por cumStart
  let lo = 0, hi = flat.length - 1, ans = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (flat[mid].cumStart <= pos) { ans = mid; lo = mid + 1 } else { hi = mid - 1 }
  }
  return ans
}

function isBoundary(flat, cycleIndex) {
  if (flat.length === 0) return false
  if (cycleIndex === 0) return true // wrap al inicio del ciclo
  return flat[cycleIndex].assetIndex !== flat[cycleIndex - 1].assetIndex
}

/** Discontinuidades dentro de un ciclo hasta (sin incluir) cycleIndex. */
function discBefore(flat, cycleIndex) {
  let c = 0
  for (let i = 1; i < cycleIndex; i++) {
    if (isBoundary(flat, i)) c++
  }
  return c
}

/**
 * Genera el manifiesto HLS en vivo.
 * @param {object} cycle  resultado de buildCycle
 * @param {number} anchorMs  epoch del canal (ms)
 * @param {number} nowMs  ahora (ms)
 * @param {object} opts { windowSize=6, segmentUrl(trackId,file)->string, liveEdge=true }
 */
export function buildLiveManifest(cycle, anchorMs, nowMs, opts = {}) {
  const { flat, total, discontPerCycle } = cycle
  const windowSize = opts.windowSize || 6
  const segmentUrl = opts.segmentUrl || ((trackId, file) => `/seg/${trackId}/${file}`)
  if (flat.length === 0 || total <= 0) {
    // Manifiesto vacío (canal sin contenido): válido pero sin segmentos.
    return ['#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:2', '#EXT-X-MEDIA-SEQUENCE:0', '#EXT-X-DISCONTINUITY-SEQUENCE:0', ''].join('\n')
  }

  const len = flat.length
  const elapsed = Math.max(0, nowMs - anchorMs)
  const cycles = Math.floor(elapsed / total)
  const p = elapsed % total
  const idx = indexAtPosition(flat, total, p)
  const ordinal = cycles * len + idx

  const targetDur = Math.max(1, Math.ceil(Math.max(...flat.map((s) => s.dur), 2000) / 1000))
  const startOrdinal = Math.max(0, ordinal - (windowSize - 1))
  const mediaSequence = startOrdinal
  // DS = discontinuidades antes del primer segmento de la ventana
  const firstCycleIndex = ((startOrdinal % len) + len) % len
  const firstCycleNum = Math.floor(startOrdinal / len)
  const discBeforeFirst = firstCycleNum * discontPerCycle + discBefore(flat, firstCycleIndex)
  const discSequence = Math.max(0, discBeforeFirst)

  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${targetDur}`,
    `#EXT-X-MEDIA-SEQUENCE:${mediaSequence}`,
    `#EXT-X-DISCONTINUITY-SEQUENCE:${discSequence}`,
  ]

  for (let ord = startOrdinal; ord <= ordinal; ord++) {
    const ci = ((ord % len) + len) % len
    const seg = flat[ci]
    if (isBoundary(flat, ci)) lines.push('#EXT-X-DISCONTINUITY')
    lines.push(`#EXTINF:${(seg.dur / 1000).toFixed(3)},`)
    lines.push(segmentUrl(seg.trackId, seg.file))
  }
  lines.push('')
  return lines.join('\n')
}
