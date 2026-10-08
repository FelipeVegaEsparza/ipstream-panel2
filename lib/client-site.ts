// =====================================================
// Client site — shell dinámico del bundle único de la PWA
// =====================================================
// El bundle único (Vite) se publica en CLIENT_SITE_DIR. El tenant handler
// sirve sus assets estáticos y construye, por dominio, el HTML con Open Graph,
// el manifest y los iconos del cliente.

import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { normalizeImageUrl } from '@/lib/image-url-helper'

export const CLIENT_SITE_DIR =
  process.env.CLIENT_SITE_DIR || path.join(process.cwd(), 'public', 'client-site')

/** Iconos servidos por el shell, mapeados a su tamaño en px. */
export const ICON_SIZES: Record<string, number> = {
  'favicon.png': 48,
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-maskable-512.png': 512,
  'apple-touch-icon.png': 180,
}

export const ICON_FILES = new Set(Object.keys(ICON_SIZES))

const MIME: Record<string, string> = {
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  webmanifest: 'application/manifest+json; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  map: 'application/json; charset=utf-8',
}

export function mimeFor(relPath: string): string {
  const ext = relPath.split('.').pop()?.toLowerCase() || ''
  return MIME[ext] || 'application/octet-stream'
}

/** Lee un archivo del bundle, con guarda contra path traversal. Null si no existe. */
export async function readSiteFile(relPath: string): Promise<Buffer | null> {
  if (!relPath) return null
  const baseDir = path.resolve(CLIENT_SITE_DIR)
  const segments = relPath.split('/').filter(Boolean)
  for (const seg of segments) {
    if (seg === '.' || seg === '..' || seg.includes('\\')) return null
  }
  const filePath = path.resolve(baseDir, ...segments)
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) return null
  try {
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

export async function getIndexHtml(): Promise<string | null> {
  const buf = await readSiteFile('index.html')
  return buf ? buf.toString('utf8') : null
}

export interface OgMetaInput {
  title?: string | null
  description?: string | null
  image?: string | null
  url?: string | null
  siteName?: string | null
  themeColor?: string | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function propMeta(property: string, content: string): string {
  return `    <meta property="${property}" content="${escapeHtml(content)}" />`
}

function nameMeta(name: string, content: string): string {
  return `    <meta name="${name}" content="${escapeHtml(content)}" />`
}

function renderOgMeta(input: OgMetaInput): string {
  const title = input.title?.trim() || null
  const description = input.description?.trim() || null
  const image = input.image?.trim() || null
  const url = input.url?.trim() || null
  const siteName = input.siteName?.trim() || title

  const lines: string[] = [propMeta('og:type', 'website')]
  if (siteName) lines.push(propMeta('og:site_name', siteName))
  if (title) lines.push(propMeta('og:title', title), nameMeta('twitter:title', title))
  if (description) {
    lines.push(propMeta('og:description', description), nameMeta('twitter:description', description))
  }
  if (image) lines.push(propMeta('og:image', image), nameMeta('twitter:image', image))
  if (url) lines.push(propMeta('og:url', url))
  lines.push(nameMeta('twitter:card', image ? 'summary_large_image' : 'summary'))
  return lines.join('\n')
}

export function injectOgMeta(html: string, input: OgMetaInput): string {
  const tags = renderOgMeta(input)
  const marker = '<!-- og-meta -->'

  // El build de la PWA ya hornea og/twitter por defecto: los quitamos para no
  // dejar duplicados que los crawlers lean antes que los del cliente.
  let result = html.replace(/\s*<meta (?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>/g, '')

  result = result.includes(marker)
    ? result.replace(marker, tags)
    : result.replace('</head>', `${tags}\n  </head>`)

  const title = input.title?.trim()
  if (title) {
    result = result.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
  }

  const description = input.description?.trim()
  if (description && /<meta name="description"[^>]*>/.test(result)) {
    result = result.replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    )
  }

  const theme = input.themeColor?.trim()
  if (theme) {
    if (/<meta name="theme-color"[^>]*>/.test(result)) {
      result = result.replace(
        /<meta name="theme-color"[^>]*>/,
        `<meta name="theme-color" content="${escapeHtml(theme)}" />`
      )
    } else {
      result = result.replace('</head>', `  <meta name="theme-color" content="${escapeHtml(theme)}" />\n  </head>`)
    }
  }
  return result
}

/** Resuelve una URL de imagen del cliente a absoluta sobre el dominio del sitio. */
function absoluteImage(url: string | null | undefined, origin: string): string | null {
  const normalized = normalizeImageUrl(url)
  if (!normalized) return null
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (normalized.startsWith('/')) return `${origin}${normalized}`
  return null
}

async function loadBranding(clientId: string) {
  const [client, basic] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { name: true, accentColor: true } }),
    prisma.basicData.findUnique({
      where: { clientId },
      select: { projectName: true, projectDescription: true, logoUrl: true, coverUrl: true },
    }),
  ])
  return { client, basic }
}

/** Construye el HTML del shell con los metadatos del cliente resuelto. */
export async function renderShell(clientId: string, origin: string, html: string): Promise<string> {
  const { client, basic } = await loadBranding(clientId)
  const title = basic?.projectName || client?.name || null
  const image = absoluteImage(basic?.coverUrl, origin) || absoluteImage(basic?.logoUrl, origin)
  const logo = absoluteImage(basic?.logoUrl, origin)

  return injectOgMeta(html, {
    title,
    description: basic?.projectDescription || null,
    image: image || logo,
    url: origin,
    siteName: title,
    themeColor: client?.accentColor || null,
  })
}

export interface TenantManifest {
  name: string
  short_name: string
  description: string
  lang: string
  start_url: string
  scope: string
  display: string
  theme_color: string
  background_color: string
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>
}

export async function buildManifest(clientId: string, origin: string): Promise<TenantManifest | null> {
  const { client, basic } = await loadBranding(clientId)
  if (!client) return null
  const name = basic?.projectName || client.name || 'IPStream'
  const theme = client.accentColor || '#1a1a2e'
  return {
    name,
    short_name: name.length > 12 ? `${name.slice(0, 12)}…` : name,
    description: basic?.projectDescription || `App PWA de ${name}`,
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: theme,
    background_color: theme,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

export function notConfiguredHtml(host: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Sitio no configurado</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
             background: #0f0f1a; color: #e5e7eb; font-family: system-ui, sans-serif; text-align: center; }
      .box { max-width: 32rem; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
      p { color: #9ca3af; margin: .25rem 0; }
      code { color: #22d3ee; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Sitio no configurado</h1>
      <p>No hay un cliente asociado al dominio <code>${escapeHtml(host)}</code>.</p>
      <p>Si eres el administrador, registra este dominio en el panel.</p>
    </div>
  </body>
</html>`
}
