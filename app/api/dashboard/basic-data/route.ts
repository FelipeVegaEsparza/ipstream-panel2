import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // MENU_GUARD_INJECTED
  {
    const { isMenuItemEnabled } = await import('@/lib/menu-permissions')
    const { getEffectiveClient } = await import('@/lib/getEffectiveClient')
    const effectiveClient = await getEffectiveClient()
    if (effectiveClient) {
      const allowed = await isMenuItemEnabled(effectiveClient.clientId, 'basic-data')
      if (!allowed) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  }
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener clientId del query parameter
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'ClientId requerido' }, { status: 400 })
    }

    // Verificar que el usuario tenga acceso a este cliente
    // Si es CLIENT, debe ser su propio cliente
    // Si es ADMIN, puede acceder a cualquier cliente (impersonación)
    if (session.user.role === 'CLIENT' && session.user.clientId !== clientId) {
      return NextResponse.json({ error: 'No autorizado para este cliente' }, { status: 403 })
    }

    // Obtener datos básicos del cliente
    const basicData = await prisma.basicData.findUnique({
      where: { clientId }
    })

    // Las URLs de streaming se derivan SIEMPRE del servidor asignado (admin).
    const { getClientStreamUrls } = await import('@/lib/streaming-helpers')
    const { radioStreamingUrl, videoStreamingUrl } = await getClientStreamUrls(clientId)

    return NextResponse.json({
      basicData: basicData
        ? { ...basicData, radioStreamingUrl, videoStreamingUrl }
        : null,
    })

  } catch (error) {
    console.error('Error al obtener datos básicos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
