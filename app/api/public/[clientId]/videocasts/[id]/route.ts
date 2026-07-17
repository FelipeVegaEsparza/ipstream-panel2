import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; id: string } }
) {
  try {
    const { clientId, id } = params

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Obtener el videocast específico (solo video)
    const videocast = await prisma.podcast.findFirst({
      where: { 
        id,
        clientId,
        fileType: 'video' // Solo video
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        videoUrl: true,
        duration: true,
        episodeNumber: true,
        season: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!videocast) {
      return createCorsErrorResponse('Episodio no encontrado', 404)
    }

    return createCorsResponse(videocast)

  } catch (error) {
    console.error('Error getting videocast:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}