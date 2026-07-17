import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log('🔍 [API] Session user:', session?.user?.email, 'Role:', session?.user?.role)
    
    if (!session?.user) {
      console.log('❌ [API] No session user')
      return NextResponse.json({ isImpersonating: false })
    }

    // Verificar cookie de impersonación
    const impersonationToken = request.cookies.get('impersonation_token')?.value
    console.log('🍪 [API] Impersonation token exists:', !!impersonationToken)
    
    if (!impersonationToken) {
      console.log('❌ [API] No impersonation token')
      return NextResponse.json({ isImpersonating: false })
    }

    try {
      // Decodificar token de impersonación
      const impersonationData = JSON.parse(Buffer.from(impersonationToken, 'base64').toString())
      console.log('📊 [API] Decoded impersonation data:', impersonationData)
      
      // Verificar que el token no haya expirado
      if (Date.now() >= impersonationData.expires) {
        console.log('⏰ [API] Token expired')
        // Token expirado, limpiar cookie
        const response = NextResponse.json({ isImpersonating: false })
        response.cookies.delete('impersonation_token')
        return response
      }

      // Verificar que el usuario actual sea admin O que tenga una sesión de impersonación válida
      // Durante la impersonación, el rol puede cambiar a CLIENT, pero el adminId debe coincidir
      if (session.user.role !== 'ADMIN' && session.user.id !== impersonationData.adminId) {
        console.log('🚫 [API] User is not admin and not the impersonating admin:', session.user.role, session.user.id, impersonationData.adminId)
        const response = NextResponse.json({ isImpersonating: false })
        response.cookies.delete('impersonation_token')
        return response
      }

      console.log('✅ [API] Returning impersonation data')
      return NextResponse.json({
        isImpersonating: true,
        impersonationData
      })

    } catch (error) {
      console.error('Error parsing impersonation token:', error)
      const response = NextResponse.json({ isImpersonating: false })
      response.cookies.delete('impersonation_token')
      return response
    }

  } catch (error) {
    console.error('Error checking impersonation status:', error)
    return NextResponse.json({ isImpersonating: false })
  }
}