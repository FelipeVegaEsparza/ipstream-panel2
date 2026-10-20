import type { LocalTrack } from './types'
import { sanitizeArtist, sanitizeTrackTitle } from '@/lib/track-text'

export const DEFAULT_PRESENTER_PHRASES = [
  'Estás escuchando {{radio}}. A continuación, {{titulo}} de {{artista}}.',
  'Seguimos en {{radio}} con {{titulo}}, de {{artista}}.',
  'No te muevas, en {{radio}} ahora suena {{titulo}} de {{artista}}.',
  'Esto es {{radio}}. Te presento {{titulo}}, de {{artista}}.',
  'La música sigue en {{radio}}. Ahora, {{titulo}} de {{artista}}.',
]

const PLACEHOLDER_RE = /\{\{\s*(radio|titulo|artista)\s*\}\}/i

export interface PresenterTrack {
  title?: string | null
  artist?: string | null
  name?: string | null
}

function clean(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function trackTitle(track: PresenterTrack): string {
  const title = sanitizeTrackTitle(clean(track.title), track.artist)
  if (title) return title
  const fallback = sanitizeTrackTitle(clean(track.name).replace(/\.[^.]+$/, ''), track.artist)
  return fallback || 'la siguiente canción'
}

export function normalizePhrases(phrases: string[] | null | undefined): string[] {
  const list = (phrases || [])
    .map((phrase) => clean(phrase))
    .filter(Boolean)
    .slice(0, 20)
  return list.length > 0 ? list : DEFAULT_PRESENTER_PHRASES
}

export function buildPresenterText(
  stationName: string,
  track: PresenterTrack | null,
  phrases: string[] | null | undefined = DEFAULT_PRESENTER_PHRASES
): string {
  const station = clean(stationName) || 'la radio'
  if (!track) {
    return `Estás escuchando ${station}. Seguimos con la mejor música.`.slice(0, 300)
  }

  const title = trackTitle(track)
  const artist = sanitizeArtist(clean(track.artist))
  const list = normalizePhrases(phrases)
  const template = list[Math.floor(Math.random() * list.length)]

  if (!PLACEHOLDER_RE.test(template)) {
    return `${template} En ${station}, a continuación, ${title}${artist ? `, de ${artist}` : ''}.`.slice(0, 300)
  }

  return template
    .replace(/\{\{\s*radio\s*\}\}/gi, station)
    .replace(/\{\{\s*titulo\s*\}\}/gi, title)
    .replace(/\{\{\s*artista\s*\}\}/gi, artist || 'la emisora')
    .replace(/\s*,\s*de\s+la emisora\.?/gi, '.')
    .replace(/\s+/g, ' ')
    .slice(0, 300)
}
