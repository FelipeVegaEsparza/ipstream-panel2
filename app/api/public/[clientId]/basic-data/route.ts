import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, plan: { select: { services: true } } }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Servicios incluidos en el plan del cliente (contrato para el reproductor).
    // Fail-open: sin plan → both, igual que el panel.
    const services = client.plan?.services || 'both'

    // Obtener datos básicos
    const basicData = await prisma.basicData.findUnique({
      where: { clientId },
      select: {
        projectName: true,
        projectDescription: true,
        logoUrl: true,
        coverUrl: true,
        radioStreamingUrl: true,
        videoStreamingUrl: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!basicData) {
      return createCorsErrorResponse('Datos básicos no encontrados', 404)
    }

    // Las URLs de streaming se derivan del servidor asignado al cliente.
    const { getClientStreamUrls } = await import('@/lib/streaming-helpers')
    const { radioStreamingUrl, videoStreamingUrl } = await getClientStreamUrls(clientId)

    return createCorsResponse({ ...basicData, radioStreamingUrl, videoStreamingUrl, services })

  } catch (error) {
    console.error('Error getting basic data:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}