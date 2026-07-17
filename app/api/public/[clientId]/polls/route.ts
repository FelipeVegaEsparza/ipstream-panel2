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

    return createCorsResponse(polls)
  } catch (error) {
    console.error('Error getting polls:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
