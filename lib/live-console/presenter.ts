import type { LocalTrack } from './types'

function clean(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function trackTitle(track: LocalTrack): string {
  const title = clean(track.title)
  if (title) return title
  return clean(track.name).replace(/\.[^.]+$/, '') || 'la siguiente canción'
}

export function buildPresenterText(stationName: string, track: LocalTrack | null): string {
  const station = clean(stationName) || 'la radio'
  if (!track) {
    return `Estás escuchando ${station}. Seguimos con la mejor música.`.slice(0, 300)
  }
  const title = trackTitle(track)
  const artist = clean(track.artist)
  const intro = artist
    ? `Estás escuchando ${station}. A continuación, ${title}, de ${artist}.`
    : `Estás escuchando ${station}. A continuación, ${title}.`
  return `${intro} Seguimos con la mejor música.`.slice(0, 300)
}
