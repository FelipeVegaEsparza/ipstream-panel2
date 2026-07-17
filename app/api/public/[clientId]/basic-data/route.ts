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
      select: { id: true }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

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

    return createCorsResponse(basicData)

  } catch (error) {
    console.error('Error getting basic data:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}