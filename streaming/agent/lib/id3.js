// =====================================================
// ID3 — extracción de metadata de archivos de audio
// =====================================================
// Usa music-metadata (ya está en package.json).

import { parseFile } from 'music-metadata'
import { extname } from 'path'
import { logger } from './logger.js'

/**
 * Lee metadata de un archivo de audio.
 * @param {string} filePath
 * @returns {Promise<{ title: string, artist: string | null, album: string | null, duration: number | null, format: string | null }>}
 */
export async function readMetadata(filePath) {
  try {
    const meta = await parseFile(filePath, { duration: true, skipCovers: true })
    const { common, format } = meta
    return {
      title: common.title || basenameNoExt(filePath),
      artist: common.artist || null,
      album: common.album || null,
      duration: Math.round(common.duration || format.duration || 0) || null,
      format: format.container ? format.container.toUpperCase() : null,
    }
  } catch (err) {
    logger.warn({ err: err.message, filePath }, 'No se pudo leer metadata')
    // Devolvemos metadata mínima basada en el nombre
    return {
      title: basenameNoExt(filePath),
      artist: null,
      album: null,
      duration: null,
      format: null,
    }
  }
}

function basenameNoExt(filePath) {
  const base = filePath.split('/').pop() || ''
  return base.replace(/\.[^.]+$/, '')
}

/**
 * Sanitiza un nombre de archivo para que sea seguro de guardar en filesystem.
 * - Solo permite letras, números, espacios, guiones y puntos
 * - Reemplaza espacios por guiones bajos
 * - Trunca a 100 chars
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFileName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')          // sin tildes
    .replace(/[^a-zA-Z0-9._-]/g, '_')         // solo chars seguros
    .replace(/_{2,}/g, '_')                    // colapsar underscores
    .replace(/^[._-]+|[._-]+$/g, '')          // trim
    .slice(0, 100) || 'unnamed'
}

/**
 * Detecta si un archivo es MP3 basándose en extensión y MIME type.
 * @param {string} filename
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isMp3(filename, mimeType) {
  const ext = extname(filename).toLowerCase()
  if (ext === '.mp3') return true
  if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) return true
  return false
}
