// =====================================================
// Client icons — iconos por cliente para el manifest PWA
// =====================================================
// Genera los tamaños requeridos a partir de la imagen cuadrada del cliente
// (prefiere el `cover`, que suele ser el ícono cuadrado diseñado; si no, el
// `logo`) y los cachea en disco. Si el cliente no tiene imagen (o falla),
// devuelve null para que el shell use los iconos compartidos del bundle.

import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { normalizeImageUrl } from '@/lib/image-url-helper'
import { ICON_SIZES } from '@/lib/client-site'

const ICONS_CACHE_DIR =
  process.env.CLIENT_ICONS_DIR || path.join(process.cwd(), 'public', 'client-icons')

// Cambia al modificar la lógica de generación para invalidar iconos cacheados.
const ICON_CACHE_VERSION = 'v2'

async function loadImageSource(rawUrl: string | null | undefined): Promise<Buffer | null> {
  if (!rawUrl) return null

  if (/^https?:\/\//i.test(rawUrl)) {
    try {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    } catch {
      return null
    }
  }

  // Ruta local servida por el panel: /uploads/... o /api/uploads/...
  let storageUrl = normalizeImageUrl(rawUrl) // deja /api/uploads/... para el request
  if (storageUrl.startsWith('/api/uploads/')) storageUrl = storageUrl.replace('/api/uploads/', '/uploads/')
  if (!storageUrl.startsWith('/uploads/')) return null

  const baseDir = path.resolve(process.cwd(), 'public', 'uploads')
  const rel = storageUrl.replace('/uploads/', '')
  const segments = rel.split('/').filter(Boolean)
  for (const seg of segments) {
    if (seg === '.' || seg === '..' || seg.includes('\\')) return null
  }
  const filePath = path.resolve(baseDir, ...segments)
  if (!filePath.startsWith(baseDir + path.sep)) return null
  try {
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

function isSquare(width?: number, height?: number): boolean {
  if (!width || !height) return false
  return Math.abs(width - height) / Math.max(width, height) < 0.05
}

function hexToRgb(hex: string | null | undefined): { r: number; g: number; b: number } | null {
  if (!hex) return null
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

interface IconSource {
  buffer: Buffer
  square: boolean
  background: { r: number; g: number; b: number } | null
}

/**
 * Elige la mejor imagen para el icono: la primera cuadrada entre `cover` y
 * `logo`; si ninguna es cuadrada, la primera disponible (se encuadrará con
 * `contain`). El fondo (para recortes no cuadrados) sale del color de acento.
 */
async function pickIconSource(clientId: string): Promise<IconSource | null> {
  const [basic, client] = await Promise.all([
    prisma.basicData.findUnique({
      where: { clientId },
      select: { logoUrl: true, coverUrl: true },
    }),
    prisma.client.findUnique({
      where: { id: clientId },
      select: { accentColor: true },
    }),
  ])

  const candidates = [basic?.coverUrl, basic?.logoUrl].filter(
    (url): url is string => Boolean(url)
  )
  const background = hexToRgb(client?.accentColor)

  let firstAvailable: Buffer | null = null
  for (const url of candidates) {
    const buffer = await loadImageSource(url)
    if (!buffer) continue

    let square = false
    try {
      const meta = await sharp(buffer).metadata()
      square = isSquare(meta.width, meta.height)
    } catch {
      // imagen ilegible: se ignora
    }

    if (square) return { buffer, square: true, background }
    if (!firstAvailable) firstAvailable = buffer
  }

  return firstAvailable ? { buffer: firstAvailable, square: false, background } : null
}

/** Devuelve el PNG del icono pedido para el cliente, o null si no se pudo generar. */
export async function getClientIcon(clientId: string, iconName: string): Promise<Buffer | null> {
  const size = ICON_SIZES[iconName]
  if (!size) return null

  const cacheDir = path.join(ICONS_CACHE_DIR, clientId, ICON_CACHE_VERSION)
  const cachePath = path.join(cacheDir, iconName)
  try {
    return await fs.readFile(cachePath)
  } catch {
    // no está cacheado: se genera abajo
  }

  const source = await pickIconSource(clientId)
  if (!source) return null

  try {
    const pipeline = source.square
      ? sharp(source.buffer).resize(size, size, { fit: 'cover', position: 'centre' })
      : sharp(source.buffer).resize(size, size, {
          fit: 'contain',
          background: source.background
            ? { ...source.background, alpha: 1 }
            : { r: 0, g: 0, b: 0, alpha: 0 },
        })

    const out = await pipeline.png().toBuffer()
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(cachePath, out)
    return out
  } catch {
    return null
  }
}

/** Borra el cache de iconos de un cliente (al cambiar su logo o cover). */
export async function clearClientIconCache(clientId: string): Promise<void> {
  await fs.rm(path.join(ICONS_CACHE_DIR, clientId), { recursive: true, force: true })
}
