// Limpieza de títulos/artistas para las locuciones.
// Los archivos de los clientes suelen traer sufijos como "(Official Video)",
// "[HD]", "Video Oficial", códigos de ripeo o números de pista. Para la voz
// solo queremos el artista y el nombre del tema.

const GROUP_RE = /[\(\[\{]([^)\]\}]{0,100})[\)\]\}]/g

const GROUP_NOISE = new RegExp(
  [
    'official\\s+(?:music\\s+)?(?:video|audio)',
    'official\\s+lyric\\s+video',
    'lyrics?\\s+video',
    'lyric\\s+video',
    'video\\s+oficial',
    'video\\s+musical',
    'video\\s*clip',
    'videoclip',
    'music\\s+video',
    'official\\s+audio',
    'audio\\s+oficial',
    'audio\\s+only',
    'full\\s+(?:video|song)',
    'visualizer',
    'subtitulad[ao]s?',
    'traducid[ao]s?',
    'remaster(?:ed|izado)?(?:\\s+\\d{4})?',
    'deluxe(?:\\s+edition)?',
    'bonus\\s+track',
    'radio\\s+edit',
    'single\\s+version',
    'album\\s+version',
    'explicit',
    'clean',
    'en\\s+vivo',
    '\\blive\\b',
    '\\b(?:hd|hq|4k|8k|1080p|720p|480p|360p|2160p|1440p)\\b',
    '\\b(?:x264|x265|h\\.?264|h\\.?265|hevc|av1|web-?dl|bluray|brrip|dvdrip|aac|flac|mp3)\\b',
    '\\b\\d{3,4}\\s*kbps\\b',
    '^audio$',
    '^video$',
    '^oficial$',
    '^official$',
    '^lyrics?$',
    '^letras?$',
    '\\blyrics?\\b',
    '\\bletras?\\b',
  ].join('|'),
  'i'
)

const OUTSIDE_NOISE = [
  /\bofficial\s+(?:music\s+)?video\b/gi,
  /\bofficial\s+lyric\s+video\b/gi,
  /\blyrics?\s+video\b/gi,
  /\bvideo\s+oficial\b/gi,
  /\bvideo\s+musical\b/gi,
  /\bvideo\s*clip\b/gi,
  /\bvideoclip\b/gi,
  /\bmusic\s+video\b/gi,
  /\bofficial\s+audio\b/gi,
  /\baudio\s+oficial\b/gi,
  /\baudio\s+only\b/gi,
  /\bfull\s+(?:video|song)\b/gi,
  /\bvisualizer\b/gi,
  /\bsubtitulad[ao]s?\b/gi,
  /\btraducid[ao]s?\b/gi,
  /\bremaster(?:ed|izado)?(?:\s+\d{4})?\b/gi,
  /\bbonus\s+track\b/gi,
  /\bradio\s+edit\b/gi,
  /\bsingle\s+version\b/gi,
  /\balbum\s+version\b/gi,
  /\ben\s+vivo\b/gi,
  /\b(?:official|oficial)\b/gi,
  /\b(?:hd|hq|4k|8k|1080p|720p|480p|360p|2160p|1440p)\b/gi,
  /\b(?:x264|x265|h\.?264|h\.?265|hevc|av1|web-?dl|bluray|brrip|dvdrip|aac|flac|mp3)\b/gi,
  /\b\d{3,4}\s*kbps\b/gi,
  /\b(?:youtube|youtu\.be|spotify)\b/gi,
]

const URL_NOISE = [
  /https?:\/\/\S+/gi,
  /www\.\S+/gi,
  /\b(?:youtube\.com|youtu\.be|spotify\.com)\/\S+/gi,
]

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isNoiseGroup(raw: string): boolean {
  const text = normalize(raw).trim()
  if (!text) return true
  if (/^[\d\s._\-–—]+$/.test(text)) return true
  // Versiones que sí aportan información: remix, featuring, acústico, etc.
  if (/^(?:remix|acoustic|instrumental|demo)\b/.test(text)) return false
  if (/^(?:feat\.?|ft\.?)\s/.test(text)) return false
  if (/^[a-z0-9_-]{6,24}$/i.test(text) && /\d/.test(text)) return true
  return GROUP_NOISE.test(text)
}

function stripLeadingTrackNumber(value: string): string {
  return value.replace(/^\s*\d{1,3}\s*[\.\-–—]\s+/, '')
}

function stripCommon(value: string): string {
  let text = value
  for (const pattern of URL_NOISE) text = text.replace(pattern, ' ')
  text = text.replace(GROUP_RE, (full, inner: string) => (isNoiseGroup(inner) ? ' ' : full))
  for (const pattern of OUTSIDE_NOISE) text = text.replace(pattern, ' ')
  text = stripLeadingTrackNumber(text)
  text = text
    .replace(/[\(\[\{]\s*[\)\]\}]/g, ' ')
    .replace(/\s*[-–—|]\s*$/g, ' ')
    .replace(/^\s*[-–—|]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

export function sanitizeArtist(value: string | null | undefined): string {
  if (!value) return ''
  let text = value.replace(/\s*-\s*topic\s*$/i, '').replace(/\s*vevo\s*$/i, '')
  text = stripCommon(text)
  return text
}

function stripArtistPrefix(text: string, artist: string | null | undefined): string {
  if (!artist) return text
  const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`^\\s*${escaped}\\s*[-–—|]\\s*`, 'i'), '')
}

export function sanitizeTrackTitle(
  value: string | null | undefined,
  artist?: string | null
): string {
  if (!value) return ''
  const cleanArtist = sanitizeArtist(artist)
  let text = stripArtistPrefix(value, cleanArtist)
  text = stripArtistPrefix(text, artist?.trim())
  text = stripCommon(text)
  text = stripArtistPrefix(text, cleanArtist)
  text = stripArtistPrefix(text, artist?.trim())
  return text.trim()
}

export function sanitizeTrackMetadata(
  title: string | null | undefined,
  artist: string | null | undefined
): { title: string; artist: string } {
  return {
    title: sanitizeTrackTitle(title, artist),
    artist: sanitizeArtist(artist),
  }
}
