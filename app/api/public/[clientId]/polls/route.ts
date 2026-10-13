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

    const polls = await prisma.poll.findMany({
      where: { clientId, active: true },
      select: {
        id: true,
        title: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        options: {
          select: { id: true, text: true, votes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return createCachedCorsResponse(polls)
  } catch (error) {
    console.error('Error getting polls:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}

export const GET = withPublicContentCache(handleGet)
