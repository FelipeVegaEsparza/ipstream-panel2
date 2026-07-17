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
    const { searchParams } = new URL(request.url)
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50) // Máximo 50
    const skip = (page - 1) * limit

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Obtener videocasts con paginación (solo video)
    const [videocasts, total] = await Promise.all([
      prisma.podcast.findMany({
        where: { 
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
        },
        orderBy: [
          { episodeNumber: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.podcast.count({
        where: { 
          clientId,
          fileType: 'video' // Solo video
        }
      })
    ])

    const totalPages = Math.ceil(total / limit)

    return createCorsResponse({
      data: videocasts,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    })

  } catch (error) {
    console.error('Error getting videocasts:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}