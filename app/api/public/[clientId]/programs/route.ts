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

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    })

    if (!client) {
      return createCorsErrorResponse('Cliente no encontrado', 404)
    }

    // Obtener programas
    const programs = await prisma.program.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
        startTime: true,
        endTime: true,
        weekDays: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { startTime: 'asc' }
    })

    // Procesar weekDays
    const processedPrograms = programs.map(program => ({
      ...program,
      weekDays: typeof program.weekDays === 'string' ? JSON.parse(program.weekDays) : program.weekDays
    }))

    return createCorsResponse(processedPrograms)

  } catch (error) {
    console.error('Error getting programs:', error)
    return createCorsErrorResponse('Error interno del servidor', 500)
  }
}