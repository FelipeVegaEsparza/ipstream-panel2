// =====================================================
// Filesystem helpers para la biblioteca MP3
// =====================================================

import { mkdir, writeFile, unlink, stat, readdir, rename } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'
import { config } from './config.js'

const LIBRARY_PATH = config.library.path  // /var/lib/radio

/**
 * Devuelve el path del directorio MP3 de un cliente.
 */
export function clientMp3Dir(clientId) {
  return join(LIBRARY_PATH, clientId, 'mp3')
}

/**
 * Devuelve el path completo de un archivo MP3.
 */
export function mp3Path(clientId, fileName) {
  return join(clientMp3Path(clientId), fileName)
}

function clientMp3Path(clientId) {
  return join(LIBRARY_PATH, clientId, 'mp3')
}

/**
 * Asegura que el directorio del cliente existe.
 */
export async function ensureClientDir(clientId) {
  const dir = clientMp3Dir(clientId)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  return dir
}

/**
 * Genera un nombre de archivo único basado en timestamp + nombre sanitizado.
 * @param {string} originalName
 * @returns {string} ej: "1700000000_my-song.mp3"
 */
export function uniqueFileName(originalName) {
  const ext = extname(originalName).toLowerCase() || '.mp3'
  const base = originalName.replace(ext, '')
  const sanitizedBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 80) || 'track'
  return `${Date.now()}_${sanitizedBase}${ext}`
}

/**
 * Guarda un buffer/MP3 en el filesystem.
 * @param {string} clientId
 * @param {string} fileName — nombre ya sanitizado
 * @param {Buffer} buffer
 * @returns {Promise<{ path: string, size: number }>}
 */
export async function saveMp3(clientId, fileName, buffer) {
  await ensureClientDir(clientId)
  const dest = join(clientMp3Dir(clientId), fileName)
  await writeFile(dest, buffer)
  const stats = await stat(dest)
  return { path: dest, size: stats.size }
}

/**
 * Elimina un MP3 del filesystem (no hace nada si no existe).
 */
export async function deleteMp3(clientId, fileName) {
  const dest = join(clientMp3Dir(clientId), fileName)
  if (!existsSync(dest)) return false
  await unlink(dest)
  return true
}

/**
 * Lista archivos MP3 de un cliente (filesystem, no DB).
 */
export async function listMp3Files(clientId) {
  const dir = clientMp3Dir(clientId)
  if (!existsSync(dir)) return []
  const files = await readdir(dir)
  return files.filter((f) => extname(f).toLowerCase() === '.mp3')
}

/**
 * Verifica que un fileName no contenga path traversal.
 */
export function isSafeFileName(fileName) {
  if (typeof fileName !== 'string') return false
  if (fileName.includes('/') || fileName.includes('..') || fileName.includes('\\')) return false
  return true
}
