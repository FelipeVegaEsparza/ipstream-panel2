import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleCors, createCorsResponse, createCorsErrorResponse } from '@/lib/cors'
import { rateLimit } from '@/lib/rate-limit'

export async function OPTIONS() {
  return handleCors()
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string; id: string } }
) {
  try {
    const { clientId, id } = params

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const { allowed } = rateLimit({
      maxRequests: 10,
      windowMs: 60 * 1000,
      identifier: `poll-vote:${ip}:${id}`,
    })

    if (!allowed) {
      return createCorsErrorResponse('Demasiados votos, inténtalo más tarde', 429)
    }

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
