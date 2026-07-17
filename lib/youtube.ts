/**
 * Regex que captura el ID de video de YouTube en cualquiera de
 * los formatos comunes de URL.
 *
 * Soporta:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 *  - https://www.youtube.com/live/ID
 */
const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const match = url.match(YT_REGEX)
  return match?.[1] ?? null
}

export function getYouTubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
}

/**
 * Devuelve la URL de la miniatura de YouTube.
 * YouTube siempre devuelve una imagen (al menos hqdefault) aunque
 * el video sea privado o no exista, así que es seguro usar como
 * placeholder.
 */
export function getYouTubeThumbnailUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
}

/**
 * Versión "de baja resolución" que siempre existe, útil como
 * fallback si la maxresdefault devuelve 404.
 */
export function getYouTubeThumbnailFallbackUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}
