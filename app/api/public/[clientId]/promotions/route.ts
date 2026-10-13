import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCachedCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { withPublicContentCache } from '@/lib/public-cache'

export async function OPTIONS() {
  return handleCors()
}

async function handleGet(
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

    // Obtener promociones
    const promotions = await prisma.promotion.findMany({
      where: { clientId },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        link: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return createCachedCorsResponse(promotions)

  } catch (error) {
    console.error('Error getting promotions:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}

export const GET = withPublicContentCache(handleGet)
