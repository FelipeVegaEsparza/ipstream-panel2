import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        user: true,
        basicData: true
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Crear un token temporal de impersonación
    const impersonationToken = Buffer.from(JSON.stringify({
      adminId: session.user.id,
      adminEmail: session.user.email,
      adminName: session.user.name,
      clientId: client.id,
      clientUserId: client.user.id,
      clientEmail: client.user.email,
      clientName: client.user.name || client.name,
      timestamp: Date.now(),
      expires: Date.now() + (2 * 60 * 60 * 1000) // 2 horas
    })).toString('base64')

    // Registrar la impersonación en logs
    console.log(`Admin ${session.user.email} is impersonating client ${client.user.email}`)

    // Crear respuesta con cookie de impersonación
    const response = NextResponse.json({
      success: true,
      redirectUrl: '/dashboard',
      clientInfo: {
        id: client.id,
        name: client.name,
        email: client.user.email,
        projectName: client.basicData?.projectName || client.name
      }
    })

    // Establecer cookie de impersonación
    response.cookies.set('impersonation_token', impersonationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 // 2 horas
    })

    return response

  } catch (error) {
    console.error('Error en impersonación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    console.log('🛑 [API] Stopping impersonation...')
    const response = NextResponse.json({ success: true })
    
    // Eliminar cookie de impersonación
    response.cookies.delete('impersonation_token')
    console.log('🍪 [API] Impersonation cookie deleted')
    
    return response
  } catch (error) {
    console.error('Error terminando impersonación:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}