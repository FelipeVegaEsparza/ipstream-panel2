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

    // Obtener el podcast específico (solo audio)
    const podcast = await prisma.podcast.findFirst({
      where: { 
        id,
        clientId,
        fileType: 'audio' // Solo audio
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        audioUrl: true,
        duration: true,
        episodeNumber: true,
        season: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!podcast) {
      return createCorsErrorResponse('Episodio no encontrado', 404)
    }

    return createCorsResponse(podcast)

  } catch (error) {
    console.error('Error getting podcast:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}