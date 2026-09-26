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

    const messages = await prisma.gcBarMessage.findMany({
      where: { clientId },
      select: {
        id: true,
        text: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return createCorsResponse(messages)
  } catch (error) {
    console.error('Error getting gc bar messages:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
