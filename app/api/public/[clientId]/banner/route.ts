import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCachedCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { withPublicContentCache } from '@/lib/public-cache'

export async function OPTIONS() {
  return handleCors()
}

async function handleGet(request: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const { clientId } = params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const banners = await prisma.banner.findMany({
      where: { clientId },
      select: {
        id: true,
        imageUrl: true,
        linkUrl: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return createCachedCorsResponse(banners)
  } catch (error) {
    console.error('Error getting banners:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}

export const GET = withPublicContentCache(handleGet)
