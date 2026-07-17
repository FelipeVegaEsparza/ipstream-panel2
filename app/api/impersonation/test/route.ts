import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 API de prueba llamada')
    
    // Obtener token de impersonación del header
    const impersonationToken = request.headers.get('x-impersonation-token')
    console.log('🔑 Token recibido:', !!impersonationToken)
    
    if (!impersonationToken) {
      return NextResponse.json({ error: 'Token de impersonación requerido' }, { status: 400 })
    }

    // Decodificar token
    let impersonationData
    try {
      impersonationData = JSON.parse(Buffer.from(impersonationToken, 'base64').toString())
      console.log('📋 Token decodificado:', impersonationData)
    } catch (error) {
      console.error('❌ Error decodificando token:', error)
      return NextResponse.json({ error: 'Token de impersonación inválido' }, { status: 401 })
    }
    
    // Verificar expiración
    if (Date.now() > impersonationData.expires) {
      console.error('⏰ Token expirado')
      return NextResponse.json({ error: 'Token de impersonación expirado' }, { status: 401 })
    }

    console.log('✅ Token válido, devolviendo datos de prueba')
    
    return NextResponse.json({
      success: true,
      message: 'API de prueba funcionando',
      tokenData: impersonationData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Error en API de prueba:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}