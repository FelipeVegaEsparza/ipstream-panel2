import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { verifyImpersonationToken } from '@/lib/impersonation'

// Caddy marca los hosts de clientes con `x-tenant-site: 1` (la decisión de host
// vs panel la toma Caddy: el middleware corre en edge y no puede consultar la DB).
function isTenantSite(req: { headers: Headers }): boolean {
  return req.headers.get('x-tenant-site') === '1'
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Sitios de clientes (bundle único de la PWA). Todo lo que no sea /api o
    // /_next se enruta al tenant handler; las llamadas a /api pasan directo.
    if (isTenantSite(req)) {
      if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
        return NextResponse.next()
      }
      const url = req.nextUrl.clone()
      url.pathname = `/api/tenant${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }

    // Verificar acceso a rutas de admin
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Verificar acceso a rutas de dashboard
    if (pathname.startsWith('/dashboard')) {
      if (!token || (token.role !== 'CLIENT' && token.role !== 'ADMIN')) {
        return NextResponse.redirect(new URL('/auth/login', req.url))
      }
    }

    // Propagar impersonación verificada como headers de request
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/api/dashboard') ||
      pathname.startsWith('/api/news') ||
      pathname.startsWith('/api/programs') ||
      pathname.startsWith('/api/sponsors') ||
      pathname.startsWith('/api/promotions') ||
      pathname.startsWith('/api/videos')
    ) {
      const impersonationToken = req.cookies.get('impersonation_token')?.value

      if (impersonationToken) {
        const impData = await verifyImpersonationToken(impersonationToken)

        // Solo el admin que creó el token puede usarlo
        if (impData && token && (token.role === 'ADMIN' || token.sub === impData.adminId)) {
          const requestHeaders = new Headers(req.headers)
          requestHeaders.set('x-impersonation-active', 'true')
          requestHeaders.set('x-impersonation-client-id', impData.clientId)
          requestHeaders.set('x-impersonation-client-email', impData.clientEmail)
          requestHeaders.set('x-impersonation-admin-id', impData.adminId)
          return NextResponse.next({ request: { headers: requestHeaders } })
        }

        if (!impData) {
          // Token inválido o expirado, limpiar cookie
          const response = NextResponse.next()
          response.cookies.delete('impersonation_token')
          return response
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Los sitios de clientes son públicos.
        if (isTenantSite(req)) return true

        const { pathname } = req.nextUrl

        // Permitir acceso a rutas públicas
        if (pathname.startsWith('/auth') ||
            pathname === '/' ||
            pathname.startsWith('/registro') ||
            pathname.startsWith('/planes') ||
            pathname.startsWith('/api/public') ||
            pathname.startsWith('/api/uploads') ||
            pathname.startsWith('/api/auth') ||
            pathname.startsWith('/api/cron') ||
            pathname.startsWith('/api/webhook') ||
            pathname.startsWith('/api/health') ||
            pathname.startsWith('/tv') ||
            pathname.startsWith('/vod')) {
          return true
        }

        // Requerir autenticación para todas las demás rutas
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-ipstream.png|text-sanitizer.js.bak|api/auth|api/public|api/uploads|api/cron|api/webhook|api/health).*)',
  ],
};
