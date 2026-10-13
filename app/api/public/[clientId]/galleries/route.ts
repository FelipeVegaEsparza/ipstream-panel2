import { NextRequest } from 'next/server'
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

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const galleries = await prisma.gallery.findMany({
      where: { clientId },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        images: {
          select: {
            id: true,
            imageUrl: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return createCachedCorsResponse(galleries)
  } catch (error) {
    console.error('Error getting galleries:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}

export const GET = withPublicContentCache(handleGet)
