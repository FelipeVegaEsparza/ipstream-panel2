import { parseFile } from 'music-metadata'
import { extname } from 'path'
import { logger } from './logger.js'

const FILENAME_SEPARATORS = [' - ', ' – ', ' — ', '_-_', '_–_']

export async function readMetadata(filePath) {
  try {
    const meta = await parseFile(filePath, { duration: true, skipCovers: false })
    const { common, format } = meta

    const title = common.title || null
    const artist = common.artist || null
    const album = common.album || null
    const duration = Math.round(common.duration || format.duration || 0) || null
    let coverBuffer = null
    let coverFormat = null

    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0]
      coverBuffer = pic.data
      coverFormat = pic.format || 'image/jpeg'
    }

    const parsed = parseFilename(filePath)

    return {
      title: title || parsed.title,
      artist: artist || parsed.artist,
      album: album || parsed.album,
      duration,
      coverBuffer,
      coverFormat,
    }
  } catch (err) {
    logger.warn({ err: err.message, filePath }, 'No se pudo leer metadata')
    const parsed = parseFilename(filePath)
    return {
      title: parsed.title,
      artist: parsed.artist,
      album: parsed.album,
      duration: null,
      coverBuffer: null,
      coverFormat: null,
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function fetchCoverFromMusicBrainz(artist, album, title = null) {
  if (!artist) return null
  try {
    // Si no hay álbum, buscar por artista + título del tema (single).
    const queryParts = [`artist:${artist}`]
    if (album) queryParts.push(`release:${album}`)
    else if (title) queryParts.push(`recording:${title}`)
    const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(queryParts.join('+'))}&fmt=json&limit=5`

    let searchData = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'IPStreamPanel/1.0 (felipe@ipstream.cl)' },
      })
      if (res.status === 429 || res.status >= 500) {
        // MusicBrainz limita ~1 req/s: esperar y reintentar
        await sleep(1500 * (attempt + 1))
        continue
      }
      if (!res.ok) return null
      searchData = await res.json()
      break
    }
    if (!searchData || !searchData.releases || searchData.releases.length === 0) return null

    // Probar varias releases hasta encontrar una con carátula (Cover Art Archive
    // puede tener la portada en la release-group pero no en una release puntual).
    for (const release of searchData.releases.slice(0, 5)) {
      try {
        const coverRes = await fetch(`https://coverartarchive.org/release/${release.id}/front`, {
          headers: { 'User-Agent': 'IPStreamPanel/1.0 (felipe@ipstream.cl)' },
        })
        if (coverRes.ok) {
          const buffer = Buffer.from(await coverRes.arrayBuffer())
          return { buffer, format: coverRes.headers.get('content-type') || 'image/jpeg' }
        }
        await sleep(500)
      } catch (err) {
        logger.warn({ err: err.message, release: release.id }, 'Error obteniendo cover de release')
      }
    }
    return null
  } catch (err) {
    logger.warn({ err: err.message, artist, album, title }, 'Error fetching cover from MusicBrainz')
    return null
  }
}

function parseFilename(filePath) {
  const base = filePath.split('/').pop() || ''
  const name = base.replace(/\.[^.]+$/, '')

  // uniqueFileName() agrega un prefijo de timestamp ("1700000000_") y
  // reemplaza espacios por '_' (sanitize). Recuperamos un título legible:
  // 1) quitar el prefijo de timestamp, 2) '_' -> espacio.
  const cleaned = name.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || name

  let title = cleaned
  let artist = null
  let album = null

  for (const sep of FILENAME_SEPARATORS) {
    const parts = cleaned.split(sep)
    if (parts.length >= 2) {
      artist = parts[0].trim()
      title = parts.slice(1).join(sep).trim()
      break
    }
  }

  return { title: title || cleaned, artist, album }
}

export function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 100) || 'unnamed'
}

export function isMp3(filename, mimeType) {
  const ext = extname(filename).toLowerCase()
  if (ext === '.mp3') return true
  if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) return true
  return false
}
