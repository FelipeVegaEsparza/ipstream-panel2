// =====================================================
// Normalizador de metadata de la biblioteca de radio
// =====================================================
//
// Limpia el título y el artista que se muestran en la biblioteca y que usa el
// locutor IA. Reglas:
//
// 1. Unicode NFC, `_` -> espacio, quita extensión de audio final.
// 2. Quita URLs y dominios.
// 3. Quita anotaciones entre paréntesis/corchetes: técnicas ("Official Video",
//    "Audio", "Con letra", "HD"), versiones ("Remix", "Extended", "Live",
//    "feat. ...") y años. Conserva subtítulos legítimos como "(Tu Forma De Ser)".
// 4. Quita tokens técnicos sueltos: HD, HQ, 4K, 1080, 720, 320kbps, etc.
// 5. Quita el nombre del artista al inicio del título cuando viene como
//    "Artista - Tema" y el artista ya tiene su propio campo.
// 6. Quita numeración de pista inicial: "01 ", "01. ", "01 - ", "[01] ", "(01) ".
// 7. Quita separadores sobrantes al inicio/fin y colapsa espacios.
// 8. Si el resultado queda vacío, conserva el valor original.
//
// Ejemplos:
//   "Mi Canción (Official Video) [HD]"       -> "Mi Canción"
//   "Turf - Pasos al costado HD"             -> "Pasos al costado"
//   "Vasos Vacíos (Remasterizado 2008)"      -> "Vasos Vacíos"
//   "Los Piojos - El farolito (Con letra)"   -> "El farolito"
//   "Tema Central (Remix) (2021)"            -> "Tema Central"
//   "(Tu Forma De Ser)"                      -> "(Tu Forma De Ser)"
//
// El resultado es idempotente: aplicar la función sobre su salida no cambia
// nada.

const AUDIO_EXTENSION_RE = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|webm)\s*$/i
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi
const DOMAIN_RE = /\b[\w-]+\.(?:com|net|org|cl|tv|fm|co|io)(?:\/\S*)?\b/gi
const BRACKET_RE = /([\(\[])([^\)\]]*)([\)\]])/g
const LEADING_TRACK_NUMBER_RE = /^\s*(?:\[\d{1,3}\]|\(\d{1,3}\)|\d{1,3}\s*[-._)]|0\d)\s*/
const EDGE_SEPARATORS_RE = /^[\s\-–—._]+|[\s\-–—._]+$/g
const WHITESPACE_RE = /\s+/g

// Anotaciones que no forman parte del nombre real del tema. Se buscan dentro
// de paréntesis/corchetes, así que no afectan subtítulos legítimos.
const ANNOTATION_KEYWORD_RE = new RegExp(
  [
    'official', 'oficial', 'video', 'videoclip', 'audio', 'lyric', 'lyrics',
    'letra', 'karaoke', 'instrumental', 'remix', 'mix', 'versión', 'version',
    'edit', 'remaster(?:ed|izado)?', 'extended', 'club', 'dub', 'live',
    'en\\s+vivo', 'en\\s+directo', 'directo', 'acústico', 'acoustic',
    'feat\\.?', 'ft\\.?', 'session', 'sesión', 'concert', 'concierto', 'gira',
    'tour', 'deluxe', 'bonus', 'demo', 'soundtrack', 'banda\\s+sonora',
    'radio\\s+edit', 'single\\s+(?:version|edit|mix)', 'ep\\s+version',
    'album\\s+version',
  ].map((part) => `\\b(?:${part})\\b`).join('|'),
  'i'
)

const YEAR_ANNOTATION_RE = /^(?:19|20)\d{2}$/
const COVER_ONLY_RE = /^cover$/i
const WITH_ANNOTATION_RE = /^with\s+.+$/i
const TECHNICAL_ANNOTATION_RE = /\b(?:uhd|hd|hq|4k|1080p?|720p?|480p?|360p?|\d{3}\s*kbps)\b/i

// Tokens técnicos que YouTube y los nombres de archivo agregan sueltos.
const TECHNICAL_TOKEN_RE = /\b(?:uhd|hd|hq|4k|1080p?|720p?|480p?|360p?|\d{3}\s*kbps)\b/gi

// Anotaciones al final del título sin paréntesis ("Tema HD", "Tema Audio",
// "Tema con letra", "Tema en vivo").
const TRAILING_ANNOTATION_RE =
  /\s+(?:video\s+oficial|videoclip(?:\s+oficial)?|video\s*clip|audio|con\s+letra|letra|lyrics?|en\s+vivo|en\s+directo|live)\s*$/i
const TRAILING_FEAT_RE = /\s+(?:feat\.?|ft\.?)\s+.+$/i

function isRemovableAnnotation(content) {
  const value = content.trim()
  if (!value) return false
  if (YEAR_ANNOTATION_RE.test(value)) return true
  if (COVER_ONLY_RE.test(value) || WITH_ANNOTATION_RE.test(value)) return true
  if (TECHNICAL_ANNOTATION_RE.test(value)) return true
  return ANNOTATION_KEYWORD_RE.test(value)
}

function normalizeForCompare(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
}

/**
 * Quita " - Artista" del final del título cuando el artista ya está en su
 * propio campo (típico de "Tema - Artista - Video oficial").
 */
function stripTrailingArtistSuffix(title, artist) {
  if (typeof title !== 'string' || typeof artist !== 'string') return title

  const candidates = artist
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const candidate of [artist.trim(), ...candidates].filter(Boolean)) {
    const escaped = escapeRegExp(candidate)
    const suffix = new RegExp(`\\s+[-–—|]\\s+${escaped}\\s*$`, 'i')
    if (suffix.test(title)) return title.replace(suffix, '')
  }

  return title
}

/**
 * Quita "Artista - " del inicio del título cuando el artista ya está en su
 * propio campo. También reconoce prefijos con feat./ft. y artistas separados
 * por coma ("Sello, Artista").
 */
function stripLeadingArtistPrefix(title, artist) {
  if (typeof title !== 'string' || typeof artist !== 'string') return title

  const candidates = artist
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const candidate of [artist.trim(), ...candidates].filter(Boolean)) {
    const escaped = escapeRegExp(candidate)
    const exact = new RegExp(`^\\s*${escaped}\\s*[-–—|:]\\s+`, 'i')
    if (exact.test(title)) return title.replace(exact, '')

    const titleNorm = normalizeForCompare(title)
    const candidateNorm = normalizeForCompare(candidate)
    if (candidateNorm.length >= 2 && titleNorm.startsWith(candidateNorm)) {
      const rest = title.slice(candidate.length)
      if (/^\s*[-–—|:]\s+/.test(rest)) {
        return rest.replace(/^\s*[-–—|:]\s+/, '')
      }
    }
  }

  // Prefijo con feat./ft. o artista distinto al campo (canales de YouTube):
  // "Artista ft. Invitado - Tema" -> "Tema".
  const generic = title.match(/^(.{1,80}?)\s+[-–—|]\s+(.+)$/)
  if (generic) {
    const [, prefix, rest] = generic
    if (
      /[A-Za-zÀ-ÿ]/.test(prefix) &&
      prefix.split(/\s+/).length <= 8 &&
      !/[()[\]]/.test(prefix) &&
      rest.trim().length > 0 &&
      !isRemovableAnnotation(rest.trim())
    ) {
      return rest
    }
  }

  return title
}

/**
 * Normaliza un valor individual de metadata.
 * @param {string | null | undefined} value
 * @returns {string | null | undefined} valor limpio, o el original si quedaría vacío
 */
export function normalizeMetadataValue(value) {
  if (typeof value !== 'string') return value

  let result = value.normalize('NFC').replace(/_/g, ' ')
  result = result.replace(AUDIO_EXTENSION_RE, '')
  result = result.replace(URL_RE, ' ').replace(DOMAIN_RE, ' ')
  result = result.replace(BRACKET_RE, (match, _open, content) =>
    isRemovableAnnotation(content) ? ' ' : match
  )
  result = result.replace(TECHNICAL_TOKEN_RE, ' ')

  let previous
  do {
    previous = result
    result = result.replace(TRAILING_ANNOTATION_RE, '')
    // "Tema ft. Invitado" se limpia, pero no "Artista ft. Invitado - Tema":
    // en ese caso el prefijo del artista se quita más adelante.
    if (!/\s[-–—|]\s/.test(result)) {
      result = result.replace(TRAILING_FEAT_RE, '')
    }
  } while (result !== previous)

  result = result.replace(LEADING_TRACK_NUMBER_RE, '')
  result = result.replace(EDGE_SEPARATORS_RE, '').replace(WHITESPACE_RE, ' ').trim()

  return result || value
}

/**
 * Normaliza el título y el artista de una pista.
 * @param {{ title?: string | null, artist?: string | null }} metadata
 * @returns {{ title: string | null | undefined, artist: string | null | undefined, changed: boolean }}
 */
export function normalizeTrackMetadata({ title, artist } = {}) {
  const normalizedArtist = normalizeMetadataValue(artist)
  let normalizedTitle = normalizeMetadataValue(title)

  if (typeof normalizedTitle === 'string') {
    normalizedTitle = normalizeMetadataValue(
      stripLeadingArtistPrefix(
        stripTrailingArtistSuffix(normalizedTitle, normalizedArtist),
        normalizedArtist
      )
    )
  }

  return {
    title: normalizedTitle,
    artist: normalizedArtist,
    changed: normalizedTitle !== title || normalizedArtist !== artist,
  }
}
