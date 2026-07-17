import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'

export async function OPTIONS() {
  return handleCors()
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string; id: string } }
) {
  try {
    const { clientId, id } = params
    const body = await request.json()
    const optionId = body.optionId

    if (!optionId) {
      return createCorsErrorResponse('optionId es requerido', 400)
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    const poll = await prisma.poll.findFirst({
      where: { id, clientId, active: true },
      include: { options: true },
    })

    if (!poll) {
      return createCorsErrorResponse('Encuesta no encontrada o inactiva', 404)
    }

    const optionExists = poll.options.some((o) => o.id === optionId)
    if (!optionExists) {
      return createCorsErrorResponse('Opción no válida', 400)
    }

    await prisma.pollOption.update({
      where: { id: optionId },
      data: { votes: { increment: 1 } },
    })

    const updatedPoll = await prisma.poll.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        active: true,
        options: {
          select: { id: true, text: true, votes: true },
        },
      },
    })

    return createCorsResponse(updatedPoll)
  } catch (error) {
    console.error('Error voting:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}
