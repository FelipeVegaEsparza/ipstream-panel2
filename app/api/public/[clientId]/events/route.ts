import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function GET(request: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const { clientId } = params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const events = await prisma.event.findMany({
      where: { clientId },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        time: true,
        location: true,
        eventUrl: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    })

    return createCorsResponse(events)
  } catch (error) {
    console.error('Error getting events:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
