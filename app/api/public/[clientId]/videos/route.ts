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

    // Obtener videos del ranking
    const videos = await prisma.rankingVideo.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        videoUrl: true,
        description: true,
        order: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { order: 'asc' }
    })

    return createCorsResponse(videos)

  } catch (error) {
    console.error('Error getting videos:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}