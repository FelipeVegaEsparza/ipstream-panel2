import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyImpersonationToken } from '@/lib/impersonation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ isImpersonating: false })
    }

    const impersonationToken = request.cookies.get('impersonation_token')?.value

    if (!impersonationToken) {
      return NextResponse.json({ isImpersonating: false })
    }

    const impersonationData = await verifyImpersonationToken(impersonationToken)

    // Solo el admin que creó el token puede usarlo
    const isAuthorized =
      impersonationData &&
      (session.user.role === 'ADMIN' ||
        session.user.id === impersonationData.adminId ||
        session.originalUser?.id === impersonationData.adminId)

    if (!impersonationData || !isAuthorized) {
      const response = NextResponse.json({ isImpersonating: false })
      response.cookies.delete('impersonation_token')
      return response
    }

    return NextResponse.json({
      isImpersonating: true,
      impersonationData
    })
  } catch (error) {
    console.error('Error checking impersonation status:', error)
    return NextResponse.json({ isImpersonating: false })
  }
}
