// =====================================================
// Normalizador de metadata de la biblioteca de radio
// =====================================================
//
// Limpia el título y el artista que se muestran en la biblioteca y que usa el
// locutor IA. Es deliberadamente conservador: solo elimina numeración de pista
// al inicio y anotaciones delimitadas entre paréntesis/corchetes (técnicas,
// versiones o años). No corta palabras sueltas ni sufijos sin delimitar, para
// no borrar títulos legítimos como "Live and Let Die".
//
// Reglas (aplicadas por separado a título y artista):
// 1. Unicode NFC, `_` -> espacio, quita extensión de audio final.
// 2. Quita URLs y dominios.
// 3. Quita segmentos `(...)` / `[...]` con contenido técnico
//    ("Official Video", "HD", "320kbps", ...), de versión ("Remix", "Live",
//    "feat. ...") o un año de 4 dígitos.
// 4. Quita numeración de pista inicial: "01 ", "01. ", "01 - ", "[01] ", "(01) ".
// 5. Quita separadores sobrantes al inicio/fin y colapsa espacios.
// 6. Si el resultado queda vacío, conserva el valor original.
//
// Ejemplos:
//   "Mi Canción (Official Video) [HD]" -> "Mi Canción"
//   "Tema Central (Remix) (2021)"      -> "Tema Central"
//   "03 Mi Banda"                      -> "Mi Banda"
//   "(Official Video)"                 -> "(Official Video)"  (no queda vacío)
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

const TECHNICAL_ANNOTATION_PATTERNS = [
  /^official\s+(?:music\s+)?(?:video|audio)\b/i,
  /^video\s+oficial\b/i,
  /^audio\s+oficial\b/i,
  /^lyrics?\b/i,
  /^letra\b/i,
  /^(?:hd|hq|4k|1080p|720p)$/i,
  /^\d{2,4}\s*kbps$/i,
  /^mp3$/i,
  /^(?:descarga|download|gratis)$/i,
  /^youtube$/i,
]

const VERSION_ANNOTATION_PATTERNS = [
  /^remix\b/i,
  /^live\b/i,
  /^en\s+vivo\b/i,
  /^ac[uú]stico\b/i,
  /^acoustic\b/i,
  /^cover\b/i,
  /^(?:feat\.?|ft\.?)\s+.+$/i,
]

const YEAR_ANNOTATION_RE = /^(?:19|20)\d{2}$/

function isRemovableAnnotation(content) {
  const value = content.trim()
  if (!value) return false
  if (YEAR_ANNOTATION_RE.test(value)) return true
  return [...TECHNICAL_ANNOTATION_PATTERNS, ...VERSION_ANNOTATION_PATTERNS]
    .some((pattern) => pattern.test(value))
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
  const normalizedTitle = normalizeMetadataValue(title)
  const normalizedArtist = normalizeMetadataValue(artist)
  return {
    title: normalizedTitle,
    artist: normalizedArtist,
    changed: normalizedTitle !== title || normalizedArtist !== artist,
  }
}
