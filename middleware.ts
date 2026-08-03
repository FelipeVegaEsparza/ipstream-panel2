import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { verifyImpersonationToken } from '@/lib/impersonation'

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

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
        const { pathname } = req.nextUrl

        // Permitir acceso a rutas públicas
        if (pathname.startsWith('/auth') ||
            pathname === '/' ||
            pathname.startsWith('/api/public') ||
            pathname.startsWith('/api/uploads') ||
            pathname.startsWith('/api/auth') ||
            pathname.startsWith('/api/cron') ||
            pathname.startsWith('/api/webhook') ||
            pathname.startsWith('/api/health')) {
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
