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

export async function fetchCoverFromMusicBrainz(artist, album, title = null) {
  if (!artist) return null
  try {
    // Si no hay álbum, buscar por artista + título del tema (single).
    const queryParts = [`artist:${artist}`]
    if (album) queryParts.push(`release:${album}`)
    else if (title) queryParts.push(`recording:${title}`)
    const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(queryParts.join('+'))}&fmt=json&limit=3`
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'IPStreamPanel/1.0 (felipe@ipstream.cl)' },
    })
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    if (!searchData.releases || searchData.releases.length === 0) return null

    const mbid = searchData.releases[0].id
    const coverUrl = `https://coverartarchive.org/release/${mbid}/front`
    const coverRes = await fetch(coverUrl, {
      headers: { 'User-Agent': 'IPStreamPanel/1.0 (felipe@ipstream.cl)' },
    })
    if (!coverRes.ok) return null

    const buffer = Buffer.from(await coverRes.arrayBuffer())
    return { buffer, format: coverRes.headers.get('content-type') || 'image/jpeg' }
  } catch (err) {
    logger.warn({ err: err.message, artist, album }, 'Error fetching cover from MusicBrainz')
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
