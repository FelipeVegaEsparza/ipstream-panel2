import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

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

    // Guardar datos del admin en cookies para poder restaurar la sesión
    const cookieStore = cookies()
    
    // Guardar datos del admin original
    cookieStore.set('admin_backup', JSON.stringify({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      impersonationStart: Date.now(),
      clientId: client.id,
      clientName: client.name
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2 // 2 horas
    })

    // Marcar que estamos en modo impersonación
    cookieStore.set('impersonation_active', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 2 // 2 horas
    })

    // Registrar la impersonación en logs
    console.log(`Admin ${session.user.email} is switching to client ${client.user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Sesión cambiada exitosamente',
      clientUser: {
        id: client.user.id,
        email: client.user.email,
        name: client.user.name,
        role: 'CLIENT'
      },
      redirectTo: '/dashboard'
    })

  } catch (error) {
    console.error('Error al cambiar sesión:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}