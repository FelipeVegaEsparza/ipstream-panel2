import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Obtener datos del admin guardados
    const adminBackupCookie = cookieStore.get('admin_backup')
    
    if (!adminBackupCookie) {
      return NextResponse.json({ error: 'No hay sesión de admin para restaurar' }, { status: 400 })
    }

    const adminData = JSON.parse(adminBackupCookie.value)

    // Limpiar cookies de impersonación
    cookieStore.delete('admin_backup')
    cookieStore.delete('impersonation_active')

    // Registrar la restauración en logs
    console.log(`Restoring admin session for ${adminData.email} after impersonating client`)

    return NextResponse.json({
      success: true,
      message: 'Sesión de admin restaurada exitosamente',
      adminUser: {
        id: adminData.id,
        email: adminData.email,
        name: adminData.name,
        role: adminData.role
      },
      redirectTo: '/admin'
    })

  } catch (error) {
    console.error('Error al restaurar sesión:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}