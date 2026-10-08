const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,}$/
const MEDIA_EXTENSION_RE = /\.(mp4|webm|ogg|ogv|mov|m3u8)(?:[?#]|$)/i
const HLS_EXTENSION_RE = /\.m3u8(?:[?#]|$)/i

function parseUrl(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

function isYouTubeHost(host: string): boolean {
  return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')
}

function isVimeoHost(host: string): boolean {
  return host === 'vimeo.com' || host.endsWith('.vimeo.com')
}

/** Devuelve la URL de embed (YouTube/Vimeo) o null si la URL no es embebible. */
export function videoEmbedUrl(url: string): string | null {
  if (!url) return null
  const parsed = parseUrl(url)
  if (!parsed) return null

  const segments = parsed.pathname.split('/').filter(Boolean)

  if (isYouTubeHost(parsed.host)) {
    let id: string | null = null
    if (parsed.host === 'youtu.be') {
      id = segments[0] ?? null
    } else {
      const kind = segments[0]
      if (kind === 'embed' || kind === 'shorts' || kind === 'live' || kind === 'e') {
        id = segments[1] ?? null
      } else {
        // watch?v= y cualquier otra página con el parámetro v en la query
        id = parsed.searchParams.get('v')
      }
    }
    return id && YOUTUBE_ID_RE.test(id)
      ? `https://www.youtube.com/embed/${id}`
      : null
  }

  if (isVimeoHost(parsed.host)) {
    // vimeo.com/<id>, player.vimeo.com/video/<id>, vimeo.com/channels/<slug>/<id>…
    const id = [...segments].reverse().find((segment) => /^\d+$/.test(segment))
    return id ? `https://player.vimeo.com/video/${id}` : null
  }

  return null
}

/** True cuando la URL apunta directo a un archivo reproducible en un <video>. */
export function isDirectMediaFile(url: string): boolean {
  if (!url) return false
  return MEDIA_EXTENSION_RE.test(url)
}

/** True cuando la URL es una lista de reproducción HLS (.m3u8). */
export function isHlsStream(url: string): boolean {
  if (!url) return false
  return HLS_EXTENSION_RE.test(url)
}
