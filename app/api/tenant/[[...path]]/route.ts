import { NextRequest, NextResponse } from 'next/server'
import { resolveClientByHost } from '@/lib/client-domains'
import {
  ICON_FILES,
  mimeFor,
  readSiteFile,
  getIndexHtml,
  renderShell,
  buildManifest,
  notConfiguredHtml,
} from '@/lib/client-site'
import { getClientIcon } from '@/lib/client-icons'

// Node runtime: usa Prisma, fs y sharp.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fileResponse(buf: Buffer, contentType: string, immutable: boolean) {
  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': immutable
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=300',
    },
  })
}

/**
 * Shell del sitio de cliente (bundle único de la PWA).
 *
 * Caddy enruta los hosts de clientes acá (o el middleware reescribe). Según el
 * path sirve: iconos del cliente, manifest dinámico, assets del bundle o el
 * index con Open Graph del cliente resuelto por host.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const host = request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const origin = `${proto}://${host}`
    const relPath = (params.path || []).join('/')

    const resolved = await resolveClientByHost(host)

    // Iconos: del cliente si se pueden generar, si no los compartidos del bundle.
    if (ICON_FILES.has(relPath)) {
      if (resolved) {
        const icon = await getClientIcon(resolved.clientId, relPath)
        if (icon) return fileResponse(icon, 'image/png', false)
      }
      const shared = await readSiteFile(relPath)
      if (shared) return fileResponse(shared, mimeFor(relPath), false)
      return new NextResponse('Not found', { status: 404 })
    }

    // Manifest dinámico por cliente.
    if (relPath === 'manifest.webmanifest') {
      if (!resolved) return new NextResponse('Not found', { status: 404 })
      const manifest = await buildManifest(resolved.clientId, origin)
      if (!manifest) return new NextResponse('Not found', { status: 404 })
      return NextResponse.json(manifest, {
        headers: {
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Assets estáticos del bundle (js/css/sw/fuentes).
    if (relPath && relPath !== 'index.html') {
      const buf = await readSiteFile(relPath)
      if (buf) {
        const immutable =
          relPath.startsWith('assets/') ||
          relPath === 'sw.js' ||
          relPath.endsWith('.woff2')
        return fileResponse(buf, mimeFor(relPath), immutable)
      }
      // No es un archivo: cae al shell (fallback de SPA).
    }

    // Shell (index) para `/` y rutas internas de la SPA.
    const html = await getIndexHtml()
    if (!html) return new NextResponse('Client site bundle not found', { status: 503 })

    if (!resolved) {
      return new NextResponse(notConfiguredHtml(host), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const rendered = await renderShell(resolved.clientId, origin, html)
    return new NextResponse(rendered, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  } catch (error) {
    console.error('Error serving tenant site:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
