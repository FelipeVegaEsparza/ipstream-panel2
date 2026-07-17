import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function middleware(req: NextRequest) {
    try {
      const token = req.nextauth.token
      const { pathname } = req.nextUrl

      // Verificar impersonación en rutas del dashboard y API
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard') || pathname.startsWith('/api/news') || pathname.startsWith('/api/programs') || pathname.startsWith('/api/sponsors') || pathname.startsWith('/api/promotions') || pathname.startsWith('/api/videos')) {
        const impersonationToken = req.cookies.get('impersonation_token')?.value

        if (impersonationToken && token?.role === 'ADMIN') {
          try {
            const impData = JSON.parse(Buffer.from(impersonationToken, 'base64').toString())

            // Verificar que el token no haya expirado
            if (Date.now() < impData.expires) {
              // Crear una respuesta que incluya headers de impersonación
              const response = NextResponse.next()
              response.headers.set('x-impersonation-active', 'true')
              response.headers.set('x-impersonation-client-id', impData.clientId)
              response.headers.set('x-impersonation-client-email', impData.clientEmail)
              response.headers.set('x-impersonation-admin-id', impData.adminId)
              return response
            } else {
              // Token expirado, limpiar cookie
              console.log('🔄 Impersonation token expired, cleaning up')
              const response = NextResponse.next()
              response.cookies.delete('impersonation_token')
              return response
            }
          } catch (error) {
            console.error('❌ Error parsing impersonation token:', error)
            const response = NextResponse.next()
            response.cookies.delete('impersonation_token')
            return response
          }
        }
      }

      // Verificar acceso a rutas de admin
      if (pathname.startsWith('/admin')) {
        if (token?.role !== 'ADMIN') {
          console.log('🚫 Non-admin trying to access admin route')
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }

      // Verificar acceso a rutas de dashboard
      if (pathname.startsWith('/dashboard')) {
        if (!token || (token.role !== 'CLIENT' && token.role !== 'ADMIN')) {
          console.log('🚫 Unauthorized access to dashboard')
          return NextResponse.redirect(new URL('/auth/login', req.url))
        }
      }

      return NextResponse.next()
    } catch (error) {
      console.error('❌ Middleware error:', error)
      return NextResponse.next()
    }
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
    /*
     * Match all request paths except for the ones starting with:
     * - /_next/static (static files)
     * - /_next/image (image optimization requests)
     * - /favicon.ico (favicon file)
     * - /logo-ipstream.png (specific static asset)
     * - /text-sanitizer.js.bak (if it exists)
     * - /api/auth (NextAuth API routes)
     * - /api/public (public API routes)
     * - /api/uploads (uploaded files API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-ipstream.png|text-sanitizer.js.bak|api/auth|api/public|api/uploads|api/cron|api/webhook|api/health).*)',
  ],
};