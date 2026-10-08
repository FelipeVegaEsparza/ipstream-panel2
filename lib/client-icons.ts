// =====================================================
// Client icons — iconos por cliente para el manifest PWA
// =====================================================
// Genera los tamaños requeridos a partir del logo del cliente (sharp) y los
// cachea en disco. Si el cliente no tiene logo (o falla), devuelve null para
// que el shell use los iconos compartidos del bundle.

import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { normalizeImageUrl } from '@/lib/image-url-helper'
import { ICON_SIZES } from '@/lib/client-site'

const ICONS_CACHE_DIR =
  process.env.CLIENT_ICONS_DIR || path.join(process.cwd(), 'public', 'client-icons')

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

/** Devuelve el PNG del icono pedido para el cliente, o null si no se pudo generar. */
export async function getClientIcon(clientId: string, iconName: string): Promise<Buffer | null> {
  const size = ICON_SIZES[iconName]
  if (!size) return null

  const cacheDir = path.join(ICONS_CACHE_DIR, clientId)
  const cachePath = path.join(cacheDir, iconName)
  try {
    return await fs.readFile(cachePath)
  } catch {
    // no está cacheado: se genera abajo
  }

  const basic = await prisma.basicData.findUnique({
    where: { clientId },
    select: { logoUrl: true },
  })
  const source = await loadImageSource(basic?.logoUrl)
  if (!source) return null

  try {
    const out = await sharp(source)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(cachePath, out)
    return out
  } catch {
    return null
  }
}

/** Borra el cache de iconos de un cliente (al cambiar su logo). */
export async function clearClientIconCache(clientId: string): Promise<void> {
  await fs.rm(path.join(ICONS_CACHE_DIR, clientId), { recursive: true, force: true })
}
